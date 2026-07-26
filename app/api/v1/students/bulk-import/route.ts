export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import UserDoc from '@/models/User';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can bulk import students', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { students, defaultBatchId } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return apiError('Students list is required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);
    const defaultPwdHash = hashPassword('Password@123');
    let importedCount = 0;

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const username = s.username || `${(s.firstName || 'student').toLowerCase()}_${String(Date.now()).slice(-4)}`;
      const email = s.email || `${username}@apexacademy.edu`;

      // 1. Create User
      const newUser = await UserDoc.create({
        instituteId: instituteObjId,
        role: 'student',
        username,
        email,
        passwordHash: defaultPwdHash,
        firstName: s.firstName,
        lastName: s.lastName || null,
        isActive: true,
      });

      // 2. Create Student Profile
      const student = await StudentDoc.create({
        instituteId: instituteObjId,
        userId: newUser._id,
        studentId: `STU-${String(Date.now()).slice(-5)}-${i + 1}`,
        admissionNumber: `ADM-${String(Date.now()).slice(-5)}-${i + 1}`,
        firstName: s.firstName,
        lastName: s.lastName || null,
        email,
        phone: s.phone || null,
        gender: s.gender || 'male',
        isActive: true,
      });

      // 3. Batch Enrollment
      const targetBatchId = s.batchId || defaultBatchId;
      if (targetBatchId && mongoose.Types.ObjectId.isValid(targetBatchId)) {
        await BatchDoc.findByIdAndUpdate(targetBatchId, {
          $addToSet: { students: student._id },
        });
      }

      importedCount++;
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'students.bulk_import',
      entityType: 'student',
      newValues: { importedCount },
      request,
    });

    return apiSuccess({ importedCount }, `Successfully bulk imported ${importedCount} students!`);
  } catch (error) {
    console.error('Bulk import students error:', error);
    return apiError('Failed to bulk import students', 500);
  }
}
