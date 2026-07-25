export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    // 1. Fetch published marks with student and subject details
    const { data: marks } = await supabase
      .from('marks')
      .select('id, student_id, subject_id, obtained_marks, max_marks, percentage, grade, is_pass, student:students(first_name, last_name, student_id), subject:subjects(name, code)')
      .eq('institute_id', instituteId)
      .eq('is_published', true);

    // Calculate Top Student Rankers
    const studentScoresMap = new Map<string, { studentName: string; studentCode: string; totalObtained: number; totalMax: number; count: number }>();

    (marks || []).forEach((m) => {
      const sId = m.student_id;
      const sName = `${m.student?.first_name} ${m.student?.last_name}`;
      const sCode = m.student?.student_id;

      if (!studentScoresMap.has(sId)) {
        studentScoresMap.set(sId, { studentName: sName, studentCode: sCode, totalObtained: 0, totalMax: 0, count: 0 });
      }
      const item = studentScoresMap.get(sId)!;
      item.totalObtained += Number(m.obtained_marks || 0);
      item.totalMax += Number(m.max_marks || 100);
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

    // Calculate Subject Performance Matrix
    const subjectMap = new Map<string, { subjectName: string; subjectCode: string; passCount: number; totalCount: number; avgPercentage: number }>();

    (marks || []).forEach((m) => {
      const subId = m.subject_id;
      const subName = m.subject?.name || 'Subject';
      const subCode = m.subject?.code || 'SUB';

      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, { subjectName: subName, subjectCode: subCode, passCount: 0, totalCount: 0, avgPercentage: 0 });
      }
      const sItem = subjectMap.get(subId)!;
      sItem.totalCount++;
      if (m.is_pass) sItem.passCount++;
      sItem.avgPercentage += Number(m.percentage || 0);
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
      subjectMatrix: subjectMatrix,
    }, 'Class analytics fetched successfully');
  } catch (error) {
    console.error('Class analytics error:', error);
    return apiError('Failed to fetch class analytics', 500);
  }
}
