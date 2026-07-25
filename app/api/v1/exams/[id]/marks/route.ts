export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

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

    const { data: exam } = await supabase
      .from('exams')
      .select('id, institute_id, status')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!exam) return apiError('Exam not found', 404);

    if (exam.status === 'published') {
      return apiError('Cannot enter marks for a published exam', 400);
    }

    const { data: examSubject } = await supabase
      .from('exam_subjects')
      .select('id, max_marks, passing_marks')
      .eq('exam_id', params.id)
      .eq('subject_id', subjectId)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!examSubject) return apiError('Subject is not assigned to this exam', 404);

    const passingMarks = examSubject.passing_marks;
    const percentage = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 10000) / 100 : 0;
    const grade = calculateGrade(percentage);
    const isPass = obtainedMarks >= passingMarks;

    const { data: existing } = await supabase
      .from('marks')
      .select('id, obtained_marks, grade, percentage, is_pass, remarks')
      .eq('institute_id', user.instituteId)
      .eq('student_id', studentId)
      .eq('exam_id', params.id)
      .eq('subject_id', subjectId)
      .maybeSingle();

    let mark;
    let error;

    if (existing) {
      const result = await supabase
        .from('marks')
        .update({
          max_marks: maxMarks,
          obtained_marks: obtainedMarks,
          grade,
          percentage,
          is_pass: isPass,
          remarks: remarks || null,
          entered_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, institute_id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, entered_by, is_published, created_at, updated_at')
        .single();
      mark = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('marks')
        .insert({
          institute_id: user.instituteId,
          student_id: studentId,
          exam_id: params.id,
          subject_id: subjectId,
          max_marks: maxMarks,
          obtained_marks: obtainedMarks,
          grade,
          percentage,
          is_pass: isPass,
          remarks: remarks || null,
          entered_by: user.id,
          is_published: false,
        })
        .select('id, institute_id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, entered_by, is_published, created_at, updated_at')
        .single();
      mark = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === '23505') {
        return apiError('Marks already entered for this student, exam, and subject', 409);
      }
      return apiError(error.message, 400);
    }

    if (!mark) {
      return apiError('Failed to save marks', 500);
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'marks_entered',
      entityType: 'mark',
      entityId: mark.id,
      oldValues: existing || null,
      newValues: { studentId, subjectId, examId: params.id, obtainedMarks, grade, percentage, isPass },
      request,
    });

    return apiSuccess(mark, 'Marks entered successfully');
  } catch (error) {
    console.error('Enter marks error:', error);
    return apiError('An error occurred', 500);
  }
}
