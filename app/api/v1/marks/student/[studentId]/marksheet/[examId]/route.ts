export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export async function GET(request: NextRequest, { params }: { params: { studentId: string; examId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: institute } = await supabase
      .from('institutes')
      .select('id, name, code, email, phone, address, city, state_region, country, logo_url')
      .eq('id', user.instituteId)
      .maybeSingle();

    const { data: student } = await supabase
      .from('students')
      .select('id, student_id, admission_number, first_name, last_name, date_of_birth, gender, email, phone, admission_date, academic_year, profile_photo_url')
      .eq('id', params.studentId)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!student) return apiError('Student not found', 404);

    const { data: exam } = await supabase
      .from('exams')
      .select('id, name, code, academic_year, start_date, end_date, status, batch:batches(id, name, code)')
      .eq('id', params.examId)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!exam) return apiError('Exam not found', 404);

    const { data: marks } = await supabase
      .from('marks')
      .select('id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, is_published, created_at, updated_at, subject:subjects(id, name, code)')
      .eq('institute_id', user.instituteId)
      .eq('student_id', params.studentId)
      .eq('exam_id', params.examId)
      .eq('is_published', true);

    const marksList = marks || [];

    const totalMaxMarks = marksList.reduce((sum, m) => sum + (m.max_marks || 0), 0);
    const totalObtainedMarks = marksList.reduce((sum, m) => sum + (m.obtained_marks || 0), 0);
    const overallPercentage = totalMaxMarks > 0
      ? Math.round((totalObtainedMarks / totalMaxMarks) * 10000) / 100
      : 0;
    const overallGrade = calculateGrade(overallPercentage);
    const allPass = marksList.length > 0 && marksList.every(m => m.is_pass);
    const subjectsCount = marksList.length;
    const passedCount = marksList.filter(m => m.is_pass).length;
    const failedCount = marksList.filter(m => !m.is_pass).length;

    return apiSuccess(
      {
        institute,
        student,
        exam,
        subjects: marksList,
        summary: {
          totalSubjects: subjectsCount,
          totalMaxMarks,
          totalObtainedMarks,
          overallPercentage,
          overallGrade,
          passedSubjects: passedCount,
          failedSubjects: failedCount,
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
