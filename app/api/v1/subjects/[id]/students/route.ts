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
    const { studentId, studentIds, batchId } = body;
    const idsToAssign: string[] = Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []);
    if (idsToAssign.length === 0) return apiError('studentId or studentIds array is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const validStudentObjIds = idsToAssign
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validStudentObjIds.length === 0) return apiError('No valid student IDs provided', 400);

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      await BatchDoc.findOneAndUpdate(
        { _id: batchId, instituteId: instituteObjId },
        { $addToSet: { students: { $each: validStudentObjIds } } }
      );
    } else {
      await BatchDoc.updateMany(
        { subjects: new mongoose.Types.ObjectId(params.id), instituteId: instituteObjId },
        { $addToSet: { students: { $each: validStudentObjIds } } }
      );
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_students_linked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { studentIds: idsToAssign },
      request,
    });

    return apiSuccess({ linked: idsToAssign }, 'Students linked to subject successfully');
  } catch (error) {
    console.error('Link student subject error:', error);
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
    const studentId = searchParams.get('studentId');
    const batchId = searchParams.get('batchId');

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) return apiError('Valid studentId is required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      await BatchDoc.findOneAndUpdate(
        { _id: batchId, instituteId: instituteObjId },
        { $pull: { students: studentObjId } }
      );
    } else {
      await BatchDoc.updateMany(
        { subjects: new mongoose.Types.ObjectId(params.id), instituteId: instituteObjId },
        { $pull: { students: studentObjId } }
      );
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_student_unlinked',
      entityType: 'subject',
      entityId: params.id,
      newValues: { studentId },
      request,
    });

    return apiSuccess(null, 'Student unlinked from subject successfully');
  } catch (error) {
    console.error('Unlink student subject error:', error);
    return apiError('An error occurred', 500);
  }
}
