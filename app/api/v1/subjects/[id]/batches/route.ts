export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubjectDoc from '@/models/Subject';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subject id', 400);

    const body = await request.json();
    const { batchId, batchIds } = body;
    const idsToAssign: string[] = Array.isArray(batchIds) ? batchIds : (batchId ? [batchId] : []);
    if (idsToAssign.length === 0) return apiError('batchId or batchIds array is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const subjectObjId = new mongoose.Types.ObjectId(params.id);

    const subject = await SubjectDoc.findOne({
      _id: subjectObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();
    if (!subject) return apiError('Subject not found', 404);

    const validBatchObjIds = idsToAssign
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validBatchObjIds.length === 0) return apiError('No valid batch IDs provided', 400);

    // Add subject to each batch
    await BatchDoc.updateMany(
      { _id: { $in: validBatchObjIds }, instituteId: instituteObjId },
      { $addToSet: { subjects: subjectObjId } }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_batches_linked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { batchIds: idsToAssign },
      request,
    });

    return apiSuccess({ linked: idsToAssign }, 'Batches linked to subject successfully');
  } catch (error) {
    console.error('Link batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subject id', 400);

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) return apiError('Valid batchId is required', 400);

    await dbConnect();

    await BatchDoc.findByIdAndUpdate(batchId, {
      $pull: { subjects: new mongoose.Types.ObjectId(params.id) },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_batch_unlinked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { batchId },
      request,
    });

    return apiSuccess(null, 'Batch unlinked from subject successfully');
  } catch (error) {
    console.error('Unlink batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}
