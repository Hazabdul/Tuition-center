export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import TeacherDoc from '@/models/Teacher';
import SubjectDoc from '@/models/Subject';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const teacherObjId = new mongoose.Types.ObjectId(params.id);

    // Find batches where teacher is assigned
    const teacherBatches = await BatchDoc.find({
      teachers: teacherObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    })
      .select('subjects')
      .lean();

    const subjectIds = new Set<string>();
    teacherBatches.forEach((b) => {
      (b.subjects || []).forEach((sId) => subjectIds.add(sId.toString()));
    });

    const subjects = await SubjectDoc.find({
      _id: { $in: Array.from(subjectIds).map((id) => new mongoose.Types.ObjectId(id)) },
      instituteId: instituteObjId,
      deletedAt: null,
    })
      .select('_id name code description maxMarks passingMarks isActive')
      .lean();

    const result = subjects.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      code: s.code,
      description: s.description ?? null,
      maxMarks: s.maxMarks,
      passingMarks: s.passingMarks,
      isActive: s.isActive,
    }));

    return apiSuccess(result, 'Teacher subjects fetched');
  } catch (error) {
    console.error('Get teacher subjects error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    const body = await request.json();
    const { batchId } = body;
    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return apiError('Valid batchId is required to assign teacher to batch/subjects', 400);
    }

    await dbConnect();

    await BatchDoc.findByIdAndUpdate(batchId, {
      $addToSet: { teachers: new mongoose.Types.ObjectId(params.id) },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_subjects_assigned',
      entityType: 'teacher',
      entityId: params.id,
      newValues: { batchId },
      request,
    });

    return apiSuccess({ batchId }, 'Teacher assigned to batch successfully');
  } catch (error) {
    console.error('Assign teacher subjects error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return apiError('Valid batchId is required', 400);
    }

    await dbConnect();

    await BatchDoc.findByIdAndUpdate(batchId, {
      $pull: { teachers: new mongoose.Types.ObjectId(params.id) },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_subject_unlinked',
      entityType: 'teacher',
      entityId: params.id,
      newValues: { batchId },
      request,
    });

    return apiSuccess(null, 'Teacher unlinked from batch successfully');
  } catch (error) {
    console.error('Unlink teacher subject error:', error);
    return apiError('An error occurred', 500);
  }
}
