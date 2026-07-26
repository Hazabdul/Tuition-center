export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    const body = await request.json();
    const { subjects } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return apiError('Subjects array is required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const examObjId = new mongoose.Types.ObjectId(params.id);

    const exam = await ExamDoc.findOne({
      _id: examObjId,
      instituteId: instituteObjId,
    }).lean();

    if (!exam) return apiError('Exam not found', 404);

    if (exam.status === 'published') {
      return apiError('Cannot modify subjects of a published exam', 400);
    }

    for (const s of subjects) {
      if (!s.subjectId || s.maxMarks === undefined || s.passingMarks === undefined) {
        return apiError('Each subject must have subjectId, maxMarks, and passingMarks', 400);
      }
      if (Number(s.passingMarks) > Number(s.maxMarks)) {
        return apiError('Passing marks cannot exceed max marks', 400);
      }
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_subjects_assigned',
      entityType: 'exam',
      entityId: params.id,
      newValues: { count: subjects.length },
      request,
    });

    return apiSuccess([], `${subjects.length} subject(s) assigned to exam successfully`);
  } catch (error) {
    console.error('Assign exam subjects error:', error);
    return apiError('An error occurred', 500);
  }
}
