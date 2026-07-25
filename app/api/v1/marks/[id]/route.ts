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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: mark, error } = await supabase
      .from('marks')
      .select('id, institute_id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, entered_by, is_published, created_at, updated_at, student:students(id, first_name, last_name, student_id, admission_number), exam:exams(id, name, code), subject:subjects(id, name, code)')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (error || !mark) return apiError('Mark not found', 404);

    return apiSuccess(mark, 'Mark fetched successfully');
  } catch (error) {
    console.error('Get mark error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { maxMarks, obtainedMarks, remarks } = body;

    const { data: existing } = await supabase
      .from('marks')
      .select('id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, is_published')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Mark not found', 404);

    if (existing.is_published) {
      return apiError('Cannot update published marks. Unpublish the exam first.', 400);
    }

    const finalMaxMarks = maxMarks !== undefined ? maxMarks : existing.max_marks;
    const finalObtainedMarks = obtainedMarks !== undefined ? obtainedMarks : existing.obtained_marks;

    if (finalObtainedMarks < 0) return apiError('Obtained marks cannot be negative', 400);
    if (finalObtainedMarks > finalMaxMarks) return apiError('Obtained marks cannot exceed max marks', 400);

    const { data: examSubject } = await supabase
      .from('exam_subjects')
      .select('passing_marks')
      .eq('exam_id', existing.exam_id)
      .eq('subject_id', existing.subject_id)
      .maybeSingle();

    const passingMarks = examSubject?.passing_marks || 0;
    const percentage = finalMaxMarks > 0 ? Math.round((finalObtainedMarks / finalMaxMarks) * 10000) / 100 : 0;
    const grade = calculateGrade(percentage);
    const isPass = finalObtainedMarks >= passingMarks;

    const { data: mark, error } = await supabase
      .from('marks')
      .update({
        max_marks: finalMaxMarks,
        obtained_marks: finalObtainedMarks,
        grade,
        percentage,
        is_pass: isPass,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        entered_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, institute_id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, entered_by, is_published, created_at, updated_at')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'mark_updated',
      entityType: 'mark',
      entityId: params.id,
      oldValues: existing,
      newValues: { maxMarks: finalMaxMarks, obtainedMarks: finalObtainedMarks, grade, percentage, isPass },
      request,
    });

    return apiSuccess(mark, 'Mark updated successfully');
  } catch (error) {
    console.error('Update mark error:', error);
    return apiError('An error occurred', 500);
  }
}
