export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    await dbConnect();

    const batch = await BatchDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    })
      .populate('subjects', '_id name code description maxMarks passingMarks isActive')
      .lean();

    if (!batch) return apiError('Batch not found', 404);

    const result = (batch.subjects || []).map((sub: any) => ({
      id: sub._id?.toString(),
      ...sub,
    }));

    return apiSuccess(result, 'Batch subjects fetched');
  } catch (error) {
    console.error('Get batch subjects error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    const body = await request.json();
    const { subjectId, subjectIds } = body;
    const idsToAssign: string[] = Array.isArray(subjectIds) ? subjectIds : (subjectId ? [subjectId] : []);
    if (idsToAssign.length === 0) return apiError('subjectId or subjectIds array is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const validSubjectObjIds = idsToAssign
      .filter((sid) => mongoose.Types.ObjectId.isValid(sid))
      .map((sid) => new mongoose.Types.ObjectId(sid));

    if (validSubjectObjIds.length === 0) return apiError('No valid subject IDs provided', 400);

    await BatchDoc.findOneAndUpdate(
      { _id: params.id, instituteId: instituteObjId },
      { $addToSet: { subjects: { $each: validSubjectObjIds } } }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch_subjects_assigned',
      entityType: 'batch',
      entityId: params.id,
      newValues: { subjectIds: idsToAssign },
      request,
    });

    return apiSuccess({ assigned: idsToAssign }, 'Subjects assigned to batch successfully');
  } catch (error) {
    console.error('Assign batch subjects error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return apiError('Valid subjectId is required', 400);
    }

    await dbConnect();

    await BatchDoc.findOneAndUpdate(
      { _id: params.id, instituteId: new mongoose.Types.ObjectId(user.instituteId) },
      { $pull: { subjects: new mongoose.Types.ObjectId(subjectId) } }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch_subject_unlinked',
      entityType: 'batch',
      entityId: params.id,
      newValues: { subjectId },
      request,
    });

    return apiSuccess(null, 'Subject unlinked from batch successfully');
  } catch (error) {
    console.error('Unlink batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}
