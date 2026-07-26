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
      return apiError('Unauthorized: Only Institute Admins can assign teachers to batches', 403);
    }

    const batchId = params.id;
    if (!mongoose.Types.ObjectId.isValid(batchId)) return apiError('Invalid batch id', 400);

    const body = await request.json();
    const { teacherId } = body;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return apiError('Valid Teacher ID is required', 400);
    }

    await dbConnect();

    const batch = await BatchDoc.findById(batchId);
    if (!batch) return apiError('Batch not found', 404);

    const teacherObjId = new mongoose.Types.ObjectId(teacherId);
    const alreadyAssigned = (batch.teachers || []).some((t) => t.toString() === teacherObjId.toString());
    if (alreadyAssigned) return apiError('Teacher is already assigned to this batch', 400);

    await BatchDoc.findByIdAndUpdate(batchId, {
      $addToSet: { teachers: teacherObjId },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch.assign_teacher',
      entityType: 'batch',
      entityId: batchId,
      newValues: { teacherId },
      request,
    });

    return apiSuccess({ success: true }, 'Teacher assigned to batch successfully!');
  } catch (error) {
    console.error('Assign teacher error:', error);
    return apiError('Failed to assign teacher to batch', 500);
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
    const teacherId = searchParams.get('teacherId');
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return apiError('Valid Teacher ID is required', 400);
    }

    await dbConnect();

    await BatchDoc.findByIdAndUpdate(batchId, {
      $pull: { teachers: new mongoose.Types.ObjectId(teacherId) },
    });

    return apiSuccess({ success: true }, 'Teacher unassigned from batch');
  } catch (error) {
    console.error('Unassign teacher error:', error);
    return apiError('Failed to unassign teacher from batch', 500);
  }
}
