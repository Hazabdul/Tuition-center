export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import ParentDoc from '@/models/Parent';
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
  { params }: { params: { examId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!mongoose.Types.ObjectId.isValid(params.examId)) return apiError('Invalid exam id', 400);

    await dbConnect();

    let studentObjId: mongoose.Types.ObjectId | null = null;
    let studentRecord: Record<string, unknown> | null = null;

    if (user.role === 'student') {
      const student = await StudentDoc.findOne({ userId: user.id }).lean();
      if (!student) return apiError('Student not found', 404);
      studentObjId = student._id as mongoose.Types.ObjectId;
      studentRecord = { id: student._id.toString(), ...student };
    } else if (user.role === 'parent') {
      const studentParam = new URL(request.url).searchParams.get('studentId');
      if (!studentParam || !mongoose.Types.ObjectId.isValid(studentParam)) {
        return apiError('Valid Student ID required', 400);
      }
      studentObjId = new mongoose.Types.ObjectId(studentParam);
      const student = await StudentDoc.findById(studentObjId).lean();
      if (!student) return apiError('Student not found', 404);
      studentRecord = { id: student._id.toString(), ...student };
    } else {
      return apiError('Unauthorized', 403);
    }

    const exam = await ExamDoc.findById(params.examId)
      .populate('batchId', 'name')
      .lean();

    if (!exam) return apiError('Exam not found', 404);

    const institute = await InstituteDoc.findById(exam.instituteId).select('name address logoUrl').lean();

    const marks = await MarkDoc.find({
      studentId: studentObjId,
      examId: new mongoose.Types.ObjectId(params.examId),
    })
      .populate('subjectId', 'name code')
      .lean();

    const enrichedMarks = marks.map((m) => {
      const sub = m.subjectId as Record<string, unknown> | null;
      return {
        id: m._id.toString(),
        subjectName: sub?.name || 'Subject',
        maxMarks: m.maxMarks,
        obtainedMarks: m.obtainedMarks,
        grade: m.grade || calculateGrade(m.percentage || 0),
        percentage: m.percentage,
        isPass: m.isPass,
        remarks: m.remarks ?? null,
      };
    });

    const totalMarks = enrichedMarks.reduce((s, m) => s + m.maxMarks, 0);
    const obtainedMarks = enrichedMarks.reduce((s, m) => s + (m.obtainedMarks || 0), 0);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
    const grade = calculateGrade(percentage);
    const allPass = enrichedMarks.length > 0 && enrichedMarks.every((m) => m.isPass);

    return apiSuccess({
      institute,
      student: studentRecord,
      exam: { name: exam.name, code: exam.code, academicYear: exam.academicYear },
      batch: exam.batchId,
      marks: enrichedMarks,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      result: allPass ? 'PASS' : (enrichedMarks.length === 0 ? 'N/A' : 'FAIL'),
    });
  } catch (err) {
    console.error('Fetch mark sheet error:', err);
    return apiError('Failed to fetch mark sheet', 500);
  }
}
