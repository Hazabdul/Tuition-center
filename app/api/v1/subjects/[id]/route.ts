export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: subject, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !subject) return apiError('Subject not found', 404);

    const { data: batches } = await supabase
      .from('batch_subject')
      .select('batch:batches(id, name, code, academic_year, start_time, end_time, is_active)')
      .eq('subject_id', params.id);

    const { data: teachers } = await supabase
      .from('teacher_subject')
      .select('teacher:teachers(id, first_name, last_name, employee_id, specialization, is_active)')
      .eq('subject_id', params.id);

    const { data: students } = await supabase
      .from('student_subject')
      .select('student:students(id, first_name, last_name, student_id, admission_number, is_active)')
      .eq('subject_id', params.id);

    return apiSuccess({
      ...subject,
      maxMarks: subject.max_marks,
      passingMarks: subject.passing_marks,
      isActive: subject.is_active,
      batches: (batches || []).map((b: any) => b.batch).filter(Boolean),
      teachers: (teachers || []).map((t: any) => t.teacher).filter(Boolean),
      students: (students || []).map((s: any) => s.student).filter(Boolean),
    });
  } catch (error) {
    console.error('Get subject error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { name, code, description, maxMarks, passingMarks } = body;

    const { data: existing } = await supabase.from('subjects').select('*').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Subject not found', 404);

    if (code && code !== (existing as Record<string, unknown>).code) {
      const { data: existingCode } = await supabase.from('subjects').select('id').eq('institute_id', user.instituteId).eq('code', code).neq('id', params.id).is('deleted_at', null).maybeSingle();
      if (existingCode) return apiError('Subject code already exists in this institute', 409);
    }

    if (maxMarks !== undefined && passingMarks !== undefined && passingMarks > maxMarks) {
      return apiError('Passing marks cannot exceed max marks', 400);
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .update({
        name, code, description, max_marks: maxMarks, passing_marks: passingMarks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_updated', entityType: 'subject', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(subject, 'Subject updated successfully');
  } catch (error) {
    console.error('Update subject error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existing } = await supabase.from('subjects').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Subject not found', 404);

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_deleted', entityType: 'subject', entityId: params.id, request });

    return apiSuccess(null, 'Subject deleted successfully');
  } catch (error) {
    console.error('Delete subject error:', error);
    return apiError('An error occurred', 500);
  }
}
