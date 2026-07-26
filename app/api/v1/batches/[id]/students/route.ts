export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can enroll students into batches', 403);
    }

    const batchId = params.id;
    if (!mongoose.Types.ObjectId.isValid(batchId)) return apiError('Invalid batch id', 400);

    const body = await request.json();
    const { studentId } = body;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return apiError('Valid Student ID is required', 400);
    }

    await dbConnect();

    const batch = await BatchDoc.findById(batchId);
    if (!batch) return apiError('Batch not found', 404);

    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const alreadyEnrolled = (batch.students || []).some((s) => s.toString() === studentObjId.toString());
    if (alreadyEnrolled) return apiError('Student is already enrolled in this batch', 400);

    await BatchDoc.findByIdAndUpdate(batchId, {
      $addToSet: { students: studentObjId },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch.enroll_student',
      entityType: 'batch',
      entityId: batchId,
      newValues: { studentId },
      request,
    });

    return apiSuccess({ success: true }, 'Student enrolled into batch successfully!');
  } catch (error) {
    console.error('Enroll student error:', error);
    return apiError('Failed to enroll student into batch', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const batchId = params.id;
    if (!mongoose.Types.ObjectId.isValid(batchId)) return apiError('Invalid batch id', 400);

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return apiError('Valid Student ID is required', 400);
    }

    await dbConnect();

    await BatchDoc.findByIdAndUpdate(batchId, {
      $pull: { students: new mongoose.Types.ObjectId(studentId) },
    });

    return apiSuccess({ success: true }, 'Student unenrolled from batch');
  } catch (error) {
    console.error('Unenroll student error:', error);
    return apiError('Failed to unenroll student from batch', 500);
  }
}
