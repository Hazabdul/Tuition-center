export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: batch, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !batch) return apiError('Batch not found', 404);

    const { data: students } = await supabase
      .from('student_batch')
      .select('student:students(id, student_id, admission_number, first_name, last_name, email, phone, is_active)')
      .eq('batch_id', params.id);

    const { data: teachers } = await supabase
      .from('teacher_batch')
      .select('teacher:teachers(id, employee_id, first_name, last_name, email, phone, specialization, is_active)')
      .eq('batch_id', params.id);

    const { data: subjects } = await supabase
      .from('batch_subject')
      .select('subject:subjects(id, name, code, max_marks, passing_marks, is_active)')
      .eq('batch_id', params.id);

    return apiSuccess({
      ...batch,
      students: students?.map(s => s.student) || [],
      teachers: teachers?.map(t => t.teacher) || [],
      subjects: subjects?.map(s => s.subject) || [],
    });
  } catch (error) {
    console.error('Get batch error:', error);
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
    const { name, code, academicYear, startDate, endDate, startTime, endTime, capacity, description } = body;

    const { data: existing } = await supabase.from('batches').select('*').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Batch not found', 404);

    if (code && code !== (existing as Record<string, unknown>).code) {
      const { data: existingCode } = await supabase.from('batches').select('id').eq('institute_id', user.instituteId).eq('code', code).neq('id', params.id).is('deleted_at', null).maybeSingle();
      if (existingCode) return apiError('Batch code already exists in this institute', 409);
    }

    if (capacity !== undefined && capacity !== null && capacity < 1) return apiError('Capacity must be a positive number', 400);

    const { data: batch, error } = await supabase
      .from('batches')
      .update({
        name, code, academic_year: academicYear,
        start_date: startDate, end_date: endDate, start_time: startTime, end_time: endTime,
        capacity, description, updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_updated', entityType: 'batch', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(batch, 'Batch updated successfully');
  } catch (error) {
    console.error('Update batch error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existing } = await supabase.from('batches').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Batch not found', 404);

    const { error } = await supabase
      .from('batches')
      .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_deleted', entityType: 'batch', entityId: params.id, request });

    return apiSuccess(null, 'Batch deleted successfully');
  } catch (error) {
    console.error('Delete batch error:', error);
    return apiError('An error occurred', 500);
  }
}
