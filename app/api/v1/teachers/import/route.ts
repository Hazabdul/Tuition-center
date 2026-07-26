export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import TeacherDoc from '@/models/Teacher';
import InstituteDoc from '@/models/Institute';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const rows = Array.isArray(body) ? body : body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError('Rows array is required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    // Quota check
    const [currentCount, institute] = await Promise.all([
      TeacherDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
      InstituteDoc.findById(instituteObjId).select('teacherLimit').lean(),
    ]);

    const teacherLimit = institute?.teacherLimit || 100;

    if (currentCount + rows.length > teacherLimit) {
      return apiError(
        `Importing ${rows.length} teachers would exceed the institute teacher quota (${currentCount}/${teacherLimit})`,
        400
      );
    }

    // Build set of existing teacherIds to avoid collision
    const existingTeachers = await TeacherDoc.find(
      { instituteId: instituteObjId, deletedAt: null },
      { teacherId: 1 }
    ).lean();
    const existingIdSet = new Set(
      existingTeachers.map((t) => t.teacherId?.toLowerCase())
    );

    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = (row.firstName || row.first_name || row['First Name'] || row.Name)?.toString().trim();
      const lastName = (row.lastName || row.last_name || row['Last Name'] || '').toString().trim();
      let teacherId = (row.employeeId || row.employee_id || row['Employee ID'] || row.teacherId || '').toString().trim();
      const email = (row.email || row.Email || '').toLowerCase().trim() || null;
      const phone = (row.phone || row.Phone || null)?.toString().trim() || null;
      const qualification = (row.qualification || row.Qualification || null)?.toString().trim() || null;
      const specialization = (row.specialization || row.Specialization || null)?.toString().trim() || null;

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      if (!teacherId) {
        teacherId = `EMP${Math.floor(1000 + Math.random() * 9000)}`;
      }

      if (existingIdSet.has(teacherId.toLowerCase())) {
        teacherId = `${teacherId}_${Math.floor(10 + Math.random() * 90)}`;
      }

      existingIdSet.add(teacherId.toLowerCase());

      toInsert.push({
        instituteId: instituteObjId,
        teacherId,
        firstName,
        lastName: lastName || null,
        email,
        phone,
        qualification,
        specialization,
        joiningDate: new Date(),
        isActive: true,
      });
    }

    let createdCount = 0;
    if (toInsert.length > 0) {
      const inserted = await TeacherDoc.insertMany(toInsert, { ordered: false });
      createdCount = inserted.length;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teachers_bulk_imported',
      entityType: 'teacher',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} teachers imported successfully`
    );
  } catch (error) {
    console.error('Import teachers error:', error);
    return apiError('An error occurred during import', 500);
  }
}
