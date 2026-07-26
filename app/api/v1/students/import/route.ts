export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
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

    const [currentCount, institute] = await Promise.all([
      StudentDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
      InstituteDoc.findById(instituteObjId).select('studentLimit').lean(),
    ]);

    const studentLimit = institute?.studentLimit || 1000;

    if (currentCount + rows.length > studentLimit) {
      return apiError(
        `Importing ${rows.length} students would exceed institute student quota (${currentCount}/${studentLimit})`,
        400
      );
    }

    const existingStudents = await StudentDoc.find(
      { instituteId: instituteObjId, deletedAt: null },
      { studentId: 1 }
    ).lean();
    const existingIdSet = new Set(existingStudents.map((s) => s.studentId?.toLowerCase()));

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = (row.firstName || row.first_name || row['First Name'] || row.Name)?.toString().trim();
      const lastName = (row.lastName || row.last_name || row['Last Name'] || '').toString().trim();
      let studentId = (row.studentId || row.student_id || row['Student ID'] || row.ID || '').toString().trim();
      const email = (row.email || row.Email || '').toLowerCase().trim() || null;
      const phone = (row.phone || row.Phone || null)?.toString().trim() || null;
      const gender = (row.gender || row.Gender || 'other').toString().toLowerCase();

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      if (!studentId) {
        studentId = `STU${Math.floor(10000 + Math.random() * 90000)}`;
      }

      if (existingIdSet.has(studentId.toLowerCase())) {
        studentId = `${studentId}_${Math.floor(10 + Math.random() * 90)}`;
      }

      existingIdSet.add(studentId.toLowerCase());

      toInsert.push({
        instituteId: instituteObjId,
        studentId,
        firstName,
        lastName: lastName || null,
        email,
        phone,
        gender: ['male', 'female', 'other'].includes(gender) ? gender : 'other',
        isActive: true,
      });
    }

    if (toInsert.length > 0) {
      const inserted = await StudentDoc.insertMany(toInsert, { ordered: false });
      createdCount = inserted.length;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'students_bulk_imported',
      entityType: 'student',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} students imported successfully`
    );
  } catch (error) {
    console.error('Import students error:', error);
    return apiError('An error occurred during import', 500);
  }
}
