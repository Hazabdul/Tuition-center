export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import ExamDoc from '@/models/Exam';
import InstituteDoc from '@/models/Institute';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string; examId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.studentId)) return apiError('Invalid student id', 400);
    if (!mongoose.Types.ObjectId.isValid(params.examId)) return apiError('Invalid exam id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.studentId);
    const examObjId = new mongoose.Types.ObjectId(params.examId);

    const [institute, student, exam, marks] = await Promise.all([
      InstituteDoc.findOne({ _id: instituteObjId, deletedAt: null }).lean(),
      StudentDoc.findOne({ _id: studentObjId, instituteId: instituteObjId, deletedAt: null }).lean(),
      ExamDoc.findOne({ _id: examObjId, instituteId: instituteObjId }).populate('batchId', '_id name code').lean(),
      MarkDoc.find({ instituteId: instituteObjId, studentId: studentObjId, examId: examObjId })
        .populate('subjectId', '_id name code')
        .lean(),
    ]);

    if (!student) return apiError('Student not found', 404);
    if (!exam) return apiError('Exam not found', 404);

    const marksList = marks.map((m) => ({
      id: m._id.toString(),
      subject: m.subjectId,
      maxMarks: m.maxMarks,
      obtainedMarks: m.obtainedMarks,
      grade: m.grade || calculateGrade(m.percentage || 0),
      percentage: m.percentage,
      isPass: m.isPass,
      remarks: m.remarks ?? null,
    }));

    const totalMaxMarks = marksList.reduce((sum, m) => sum + (m.maxMarks || 0), 0);
    const totalObtainedMarks = marksList.reduce((sum, m) => sum + (m.obtainedMarks || 0), 0);
    const overallPercentage = totalMaxMarks > 0
      ? Math.round((totalObtainedMarks / totalMaxMarks) * 10000) / 100
      : 0;
    const overallGrade = calculateGrade(overallPercentage);
    const allPass = marksList.length > 0 && marksList.every((m) => m.isPass);

    return apiSuccess(
      {
        institute: institute ? { id: institute._id.toString(), ...institute } : null,
        student: { id: student._id.toString(), ...student },
        exam: { id: exam._id.toString(), ...exam },
        subjects: marksList,
        summary: {
          totalSubjects: marksList.length,
          totalMaxMarks,
          totalObtainedMarks,
          overallPercentage,
          overallGrade,
          passedSubjects: marksList.filter((m) => m.isPass).length,
          failedSubjects: marksList.filter((m) => !m.isPass).length,
          result: allPass ? 'PASS' : (marksList.length === 0 ? 'N/A' : 'FAIL'),
        },
      },
      'Marksheet fetched successfully'
    );
  } catch (error) {
    console.error('Marksheet error:', error);
    return apiError('An error occurred', 500);
  }
}
