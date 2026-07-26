export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import MarkDoc from '@/models/Mark';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const marks = await MarkDoc.find({
      instituteId: new mongoose.Types.ObjectId(instituteId),
    })
      .populate('studentId', '_id firstName lastName studentId')
      .populate('subjectId', '_id name code')
      .lean();

    const studentScoresMap = new Map<
      string,
      { studentName: string; studentCode: string; totalObtained: number; totalMax: number; count: number }
    >();

    marks.forEach((m) => {
      const st = m.studentId as any;
      if (!st || !st._id) return;
      const sId = st._id.toString();
      const sName = `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Student';
      const sCode = (st.studentId as string) || '-';

      if (!studentScoresMap.has(sId)) {
        studentScoresMap.set(sId, { studentName: sName, studentCode: sCode, totalObtained: 0, totalMax: 0, count: 0 });
      }
      const item = studentScoresMap.get(sId)!;
      item.totalObtained += m.obtainedMarks || 0;
      item.totalMax += m.maxMarks || 100;
      item.count++;
    });

    const rankersList = Array.from(studentScoresMap.values())
      .map((item) => ({
        studentName: item.studentName,
        studentCode: item.studentCode,
        totalObtained: item.totalObtained,
        totalMax: item.totalMax,
        overallPercentage: Number(((item.totalObtained / item.totalMax) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.overallPercentage - a.overallPercentage)
      .slice(0, 5)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const subjectMap = new Map<
      string,
      { subjectName: string; subjectCode: string; passCount: number; totalCount: number; avgPercentage: number }
    >();

    marks.forEach((m) => {
      const sub = m.subjectId as any;
      if (!sub || !sub._id) return;
      const subId = sub._id.toString();
      const subName = (sub.name as string) || 'Subject';
      const subCode = (sub.code as string) || 'SUB';

      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, { subjectName: subName, subjectCode: subCode, passCount: 0, totalCount: 0, avgPercentage: 0 });
      }
      const sItem = subjectMap.get(subId)!;
      sItem.totalCount++;
      if (m.isPass) sItem.passCount++;
      sItem.avgPercentage += m.percentage || 0;
    });

    const subjectMatrix = Array.from(subjectMap.values()).map((s) => ({
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      passPercentage: Math.round((s.passCount / s.totalCount) * 100),
      avgPercentage: Math.round(s.avgPercentage / s.totalCount),
      totalExaminees: s.totalCount,
    }));

    return apiSuccess({
      rankers: rankersList,
      subjectMatrix,
    }, 'Class analytics fetched successfully');
  } catch (error) {
    console.error('Class analytics error:', error);
    return apiError('Failed to fetch class analytics', 500);
  }
}
