export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import MarkDoc from '@/models/Mark';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const examObjId = new mongoose.Types.ObjectId(params.id);

    const exam = await ExamDoc.findOne({
      _id: examObjId,
      instituteId: instituteObjId,
    })
      .populate('batchId', '_id name code')
      .lean();

    if (!exam) return apiError('Exam not found', 404);

    const marks = await MarkDoc.find({
      examId: examObjId,
      instituteId: instituteObjId,
    })
      .populate('studentId', '_id firstName lastName studentId admissionNumber')
      .populate('subjectId', '_id name code')
      .lean();

    const studentMap = new Map<string, {
      student: unknown;
      studentId: string;
      subjects: unknown[];
      totalMaxMarks: number;
      totalObtainedMarks: number;
      overallPercentage: number;
      allPass: boolean;
    }>();

    for (const mark of marks) {
      const st = mark.studentId as any;
      if (!st || !st._id) continue;
      const studentId = st._id.toString();

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: st,
          studentId,
          subjects: [],
          totalMaxMarks: 0,
          totalObtainedMarks: 0,
          overallPercentage: 0,
          allPass: true,
        });
      }
      const studentEntry = studentMap.get(studentId)!;
      studentEntry.subjects.push({
        markId: mark._id.toString(),
        subjectId: mark.subjectId,
        maxMarks: mark.maxMarks,
        obtainedMarks: mark.obtainedMarks,
        grade: mark.grade,
        percentage: mark.percentage,
        isPass: mark.isPass,
        remarks: mark.remarks,
      });
      studentEntry.totalMaxMarks += mark.maxMarks || 0;
      studentEntry.totalObtainedMarks += mark.obtainedMarks || 0;
      if (!mark.isPass) studentEntry.allPass = false;
    }

    const results = Array.from(studentMap.values()).map((entry) => {
      entry.overallPercentage = entry.totalMaxMarks > 0
        ? Math.round((entry.totalObtainedMarks / entry.totalMaxMarks) * 10000) / 100
        : 0;
      return entry;
    });

    return apiSuccess(
      {
        exam: { id: exam._id.toString(), ...exam },
        results,
        totalStudents: results.length,
        totalSubjects: new Set(marks.map((m) => (m.subjectId as any)?._id?.toString() || (m.subjectId as any)?.toString())).size,
      },
      'Exam results fetched successfully'
    );
  } catch (error) {
    console.error('Exam results error:', error);
    return apiError('An error occurred', 500);
  }
}
