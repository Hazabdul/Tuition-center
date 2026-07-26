export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import MarkDoc from '@/models/Mark';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const examObjId = new mongoose.Types.ObjectId(params.id);

    const exam = await ExamDoc.findOne({
      _id: examObjId,
      instituteId: instituteObjId,
    }).lean();

    if (!exam) return apiError('Exam not found', 404);

    if (exam.status !== 'published') {
      return apiError('Exam results are not published', 400);
    }

    await Promise.all([
      ExamDoc.findByIdAndUpdate(params.id, { $set: { status: 'completed' } }),
      MarkDoc.updateMany({ examId: examObjId, instituteId: instituteObjId }, { $set: { isPass: false } }),
    ]);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_results_unpublished',
      entityType: 'exam',
      entityId: params.id,
      oldValues: { status: 'published' },
      newValues: { status: 'completed' },
      request,
    });

    return apiSuccess(null, 'Exam results unpublished successfully');
  } catch (error) {
    console.error('Unpublish exam error:', error);
    return apiError('An error occurred', 500);
  }
}
