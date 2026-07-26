export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import TeacherDoc from '@/models/Teacher';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    const body = await request.json();
    const { batchIds } = body;

    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return apiError('batchIds array is required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const teacherObjId = new mongoose.Types.ObjectId(params.id);

    const teacher = await TeacherDoc.findOne({
      _id: teacherObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!teacher) return apiError('Teacher not found', 404);

    const validBatchObjIds = batchIds
      .filter((bid: string) => mongoose.Types.ObjectId.isValid(bid))
      .map((bid: string) => new mongoose.Types.ObjectId(bid));

    if (validBatchObjIds.length === 0) return apiError('No valid batch IDs provided', 400);

    await BatchDoc.updateMany(
      { _id: { $in: validBatchObjIds }, instituteId: instituteObjId },
      { $addToSet: { teachers: teacherObjId } }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_batches_assigned',
      entityType: 'teacher',
      entityId: params.id,
      newValues: { batchIds },
      request,
    });

    return apiSuccess({ assigned: batchIds }, 'Batches assigned to teacher successfully');
  } catch (error) {
    console.error('Assign teacher batches error:', error);
    return apiError('An error occurred', 500);
  }
}
