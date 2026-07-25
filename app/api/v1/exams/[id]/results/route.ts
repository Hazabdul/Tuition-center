export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: exam, error } = await supabase
      .from('exams')
      .select('id, name, code, academic_year, start_date, end_date, status, batch:batches(id, name, code)')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !exam) return apiError('Exam not found', 404);

    const { data: marks } = await supabase
      .from('marks')
      .select('id, student_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, is_published, student:students(id, first_name, last_name, student_id, admission_number), subject:subjects(id, name, code)')
      .eq('exam_id', params.id)
      .eq('institute_id', user.instituteId);

    const marksList = marks || [];

    const studentMap = new Map<string, {
      student: unknown;
      studentId: string;
      subjects: unknown[];
      totalMaxMarks: number;
      totalObtainedMarks: number;
      overallPercentage: number;
      allPass: boolean;
    }>();

    for (const mark of marksList) {
      const studentId = mark.student_id as string;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: mark.student,
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
        markId: mark.id,
        subjectId: mark.subject_id,
        subject: mark.subject,
        maxMarks: mark.max_marks,
        obtainedMarks: mark.obtained_marks,
        grade: mark.grade,
        percentage: mark.percentage,
        isPass: mark.is_pass,
        remarks: mark.remarks,
        isPublished: mark.is_published,
      });
      studentEntry.totalMaxMarks += mark.max_marks || 0;
      studentEntry.totalObtainedMarks += mark.obtained_marks || 0;
      if (!mark.is_pass) studentEntry.allPass = false;
    }

    const results = Array.from(studentMap.values()).map((entry) => {
      entry.overallPercentage = entry.totalMaxMarks > 0
        ? Math.round((entry.totalObtainedMarks / entry.totalMaxMarks) * 10000) / 100
        : 0;
      return entry;
    });

    return apiSuccess(
      {
        exam,
        results,
        totalStudents: results.length,
        totalSubjects: new Set(marksList.map(m => m.subject_id)).size,
      },
      'Exam results fetched successfully'
    );
  } catch (error) {
    console.error('Exam results error:', error);
    return apiError('An error occurred', 500);
  }
}
