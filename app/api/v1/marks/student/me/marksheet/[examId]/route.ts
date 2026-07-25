export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

const DEFAULT_GRADING = [
  { min: 90, max: 100, grade: 'A+' },
  { min: 80, max: 89.99, grade: 'A' },
  { min: 70, max: 79.99, grade: 'B' },
  { min: 60, max: 69.99, grade: 'C' },
  { min: 50, max: 59.99, grade: 'D' },
  { min: 0, max: 49.99, grade: 'F' },
];

function getGrade(percentage: number, rules: typeof DEFAULT_GRADING) {
  for (const rule of rules) {
    if (percentage >= rule.min && percentage <= rule.max) return rule.grade;
  }
  return 'F';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const examId = params.examId;

    // Get student profile
    let studentId: string;
    let studentRecord: Record<string, unknown>;

    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id, student_id, admission_number, first_name, last_name')
        .eq('user_id', user.id)
        .single();
      if (!student) return apiError('Student not found', 404);
      studentId = student.id;
      studentRecord = student;
    } else if (user.role === 'parent') {
      // Parent must provide studentId query param
      const studentParam = new URL(request.url).searchParams.get('studentId');
      if (!studentParam) return apiError('Student ID required', 400);

      // Verify parent-student link
      const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
      if (!parent) return apiError('Parent not found', 404);

      const { data: link } = await supabase.from('parent_student').select('student_id').eq('parent_id', parent.id).eq('student_id', studentParam).single();
      if (!link) return apiError('Student not linked to this parent', 403);

      const { data: student } = await supabase.from('students').select('id, student_id, admission_number, first_name, last_name').eq('id', studentParam).single();
      if (!student) return apiError('Student not found', 404);
      studentId = student.id;
      studentRecord = student;
    } else {
      return apiError('Unauthorized', 403);
    }

    // Get exam
    const { data: exam } = await supabase
      .from('exams')
      .select('id, name, code, academic_year, status, batch_id, institute_id')
      .eq('id', examId)
      .single();

    if (!exam) return apiError('Exam not found', 404);
    if (exam.status !== 'published') return apiError('Results not published yet', 403);

    // Validate institute access
    if ((user.role as string) !== 'super_admin' && exam.institute_id !== user.instituteId) {
      return apiError('Access denied', 403);
    }

    // Get batch
    const { data: batch } = await supabase.from('batches').select('name').eq('id', exam.batch_id).single();

    // Get institute info
    const { data: institute } = await supabase
      .from('institutes')
      .select('name, address, logo_url')
      .eq('id', exam.institute_id)
      .single();

    // Get grading rules
    const { data: gradingRules } = await supabase
      .from('grading_rules')
      .select('min_percentage, max_percentage, grade')
      .eq('institute_id', exam.institute_id)
      .order('min_percentage', { ascending: false });

    const rules = gradingRules?.map((r: Record<string, unknown>) => ({
      min: Number(r.min_percentage), max: Number(r.max_percentage), grade: r.grade as string,
    })) || DEFAULT_GRADING;

    // Get marks with subject names
    const { data: marks } = await supabase
      .from('marks')
      .select('id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, subject:subjects(name)')
      .eq('student_id', studentId)
      .eq('exam_id', examId)
      .eq('is_published', true);

    if (!marks || marks.length === 0) return apiError('No published marks found', 404);

    const enrichedMarks = marks.map((m: Record<string, unknown>) => {
      const subject = m.subject as Record<string, string> | null;
      const maxM = Number(m.max_marks);
      const obtM = m.obtained_marks !== null ? Number(m.obtained_marks) : null;
      const pct = obtM !== null && maxM > 0 ? Math.round((obtM / maxM) * 100 * 100) / 100 : null;
      const grade = pct !== null ? getGrade(pct, rules) : null;
      return {
        id: m.id,
        subject_name: subject?.name || 'Unknown',
        max_marks: maxM,
        obtained_marks: obtM,
        grade: m.grade || grade,
        percentage: m.percentage !== null ? Number(m.percentage) : pct,
        is_pass: m.is_pass as boolean,
        remarks: m.remarks as string | null,
      };
    });

    // Totals
    const totalMarks = enrichedMarks.reduce((s, m) => s + m.max_marks, 0);
    const obtainedMarks = enrichedMarks.reduce((s, m) => s + (m.obtained_marks || 0), 0);
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 100) / 100 : 0;
    const grade = getGrade(percentage, rules);
    const allPass = enrichedMarks.every((m) => m.is_pass);
    const result = allPass ? 'Pass' : 'Fail';

    return apiSuccess({
      institute,
      student: studentRecord,
      exam: { name: exam.name, code: exam.code, academic_year: exam.academic_year },
      batch,
      marks: enrichedMarks,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      result,
    });
  } catch (err) {
    console.error(err);
    return apiError('Failed to fetch mark sheet', 500);
  }
}
