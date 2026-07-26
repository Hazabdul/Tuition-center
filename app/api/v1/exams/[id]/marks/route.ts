export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import MarkDoc from '@/models/Mark';
import mongoose from 'mongoose';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

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
    const { studentId, subjectId, maxMarks, obtainedMarks, remarks } = body;

    if (!studentId || !subjectId || maxMarks === undefined) {
      return apiError('Student ID, subject ID, and max marks are required', 400);
    }
    if (obtainedMarks === undefined || obtainedMarks === null) {
      return apiError('Obtained marks are required', 400);
    }
    if (obtainedMarks < 0) return apiError('Obtained marks cannot be negative', 400);
    if (obtainedMarks > maxMarks) return apiError('Obtained marks cannot exceed max marks', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const examObjId = new mongoose.Types.ObjectId(params.id);

    const exam = await ExamDoc.findOne({
      _id: examObjId,
      instituteId: instituteObjId,
    }).lean();

    if (!exam) return apiError('Exam not found', 404);
    if (exam.status === 'published') {
      return apiError('Cannot enter marks for a published exam', 400);
    }

    const percentage = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 10000) / 100 : 0;
    const grade = calculateGrade(percentage);
    const isPass = percentage >= 35;

    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const subjectObjId = new mongoose.Types.ObjectId(subjectId);

    const mark = await MarkDoc.findOneAndUpdate(
      {
        instituteId: instituteObjId,
        studentId: studentObjId,
        examId: examObjId,
        subjectId: subjectObjId,
      },
      {
        $set: {
          maxMarks,
          obtainedMarks,
          grade,
          percentage,
          isPass,
          remarks: remarks || null,
        },
      },
      { upsert: true, new: true }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'marks_entered',
      entityType: 'mark',
      entityId: mark._id.toString(),
      newValues: { studentId, subjectId, examId: params.id, obtainedMarks, grade, percentage, isPass },
      request,
    });

    return apiSuccess(
      { id: mark._id.toString(), obtainedMarks, grade, percentage, isPass },
      'Marks entered successfully'
    );
  } catch (error) {
    console.error('Enter marks error:', error);
    return apiError('An error occurred', 500);
  }
}
