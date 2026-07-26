export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubjectDoc from '@/models/Subject';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

// Teacher-Subject linking is modeled as Subject embedded in Batch (teachers array in Batch)
// For a dedicated teacher ↔ subject relationship, we use Batch.teachers array
// This endpoint links/unlinks teachers to batches that teach this subject

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
    const { teacherId, teacherIds, batchId } = body;
    const idsToAssign: string[] = Array.isArray(teacherIds) ? teacherIds : (teacherId ? [teacherId] : []);
    if (idsToAssign.length === 0) return apiError('teacherId or teacherIds array is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const subject = await SubjectDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();
    if (!subject) return apiError('Subject not found', 404);

    const validTeacherObjIds = idsToAssign
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validTeacherObjIds.length === 0) return apiError('No valid teacher IDs provided', 400);

    // If a batchId is provided, assign teacher to that batch; otherwise assign to all batches with this subject
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      await BatchDoc.findOneAndUpdate(
        { _id: batchId, instituteId: instituteObjId },
        { $addToSet: { teachers: { $each: validTeacherObjIds } } }
      );
    } else {
      await BatchDoc.updateMany(
        { subjects: new mongoose.Types.ObjectId(params.id), instituteId: instituteObjId },
        { $addToSet: { teachers: { $each: validTeacherObjIds } } }
      );
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_teachers_linked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { teacherIds: idsToAssign },
      request,
    });

    return apiSuccess({ linked: idsToAssign }, 'Teachers linked to subject successfully');
  } catch (error) {
    console.error('Link teacher subject error:', error);
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
    const teacherId = searchParams.get('teacherId');
    const batchId = searchParams.get('batchId');

    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) return apiError('Valid teacherId is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      await BatchDoc.findOneAndUpdate(
        { _id: batchId, instituteId: instituteObjId },
        { $pull: { teachers: teacherObjId } }
      );
    } else {
      await BatchDoc.updateMany(
        { subjects: new mongoose.Types.ObjectId(params.id), instituteId: instituteObjId },
        { $pull: { teachers: teacherObjId } }
      );
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_teacher_unlinked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { teacherId },
      request,
    });

    return apiSuccess(null, 'Teacher unlinked from subject successfully');
  } catch (error) {
    console.error('Unlink teacher subject error:', error);
    return apiError('An error occurred', 500);
  }
}
