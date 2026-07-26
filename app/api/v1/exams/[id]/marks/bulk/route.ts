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
    const { subjectId, maxMarks, marks } = body;

    if (!subjectId || maxMarks === undefined || !Array.isArray(marks) || marks.length === 0) {
      return apiError('Subject ID, max marks, and marks array are required', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId)) return apiError('Invalid subject id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const examObjId = new mongoose.Types.ObjectId(params.id);
    const subjectObjId = new mongoose.Types.ObjectId(subjectId);

    const exam = await ExamDoc.findOne({
      _id: examObjId,
      instituteId: instituteObjId,
    }).lean();

    if (!exam) return apiError('Exam not found', 404);
    if (exam.status === 'published') {
      return apiError('Cannot enter marks for a published exam', 400);
    }

    let processedCount = 0;

    for (const entry of marks) {
      const { studentId, obtainedMarks, remarks } = entry;
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) continue;
      if (obtainedMarks === undefined || obtainedMarks === null) continue;
      if (obtainedMarks < 0 || obtainedMarks > maxMarks) continue;

      const percentage = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 10000) / 100 : 0;
      const grade = calculateGrade(percentage);
      const isPass = percentage >= 35;

      await MarkDoc.findOneAndUpdate(
        {
          instituteId: instituteObjId,
          studentId: new mongoose.Types.ObjectId(studentId),
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

      processedCount++;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'marks_bulk_entered',
      entityType: 'mark',
      newValues: { examId: params.id, subjectId, processedCount },
      request,
    });

    return apiSuccess(
      { processed: processedCount, total: marks.length },
      `Bulk marks entered: ${processedCount} records processed`
    );
  } catch (error) {
    console.error('Bulk marks error:', error);
    return apiError('An error occurred', 500);
  }
}
