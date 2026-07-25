export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !teacher) return apiError('Teacher not found', 404);

    const { data: batches } = await supabase
      .from('teacher_batch')
      .select('batch:batches(id, name, code, academic_year)')
      .eq('teacher_id', params.id);

    const { data: subjects } = await supabase
      .from('teacher_subject')
      .select('subject:subjects(id, name, code), batch:batches(id, name, code)')
      .eq('teacher_id', params.id);

    return apiSuccess({
      ...teacher,
      batches: batches?.map(b => b.batch) || [],
      subjects: subjects?.map(s => ({ ...s.subject, batch: s.batch })) || [],
    });
  } catch (error) {
    console.error('Get teacher error:', error);
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
    const { employeeId, firstName, lastName, email, phone, altPhone, qualification, specialization, joiningDate, address, profilePhotoUrl, notes } = body;

    const { data: existing } = await supabase.from('teachers').select('*').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Teacher not found', 404);

    if (employeeId && employeeId !== (existing as Record<string, unknown>).employee_id) {
      const { data: existingEmp } = await supabase.from('teachers').select('id').eq('institute_id', user.instituteId).eq('employee_id', employeeId).neq('id', params.id).maybeSingle();
      if (existingEmp) return apiError('Employee ID already exists in this institute', 409);
    }

    const { data: teacher, error } = await supabase
      .from('teachers')
      .update({
        employee_id: employeeId, first_name: firstName, last_name: lastName,
        email, phone, alt_phone: altPhone, qualification, specialization,
        joining_date: joiningDate, address, profile_photo_url: profilePhotoUrl, notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, employee_id, first_name, last_name')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_updated', entityType: 'teacher', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(teacher, 'Teacher updated successfully');
  } catch (error) {
    console.error('Update teacher error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existing } = await supabase.from('teachers').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Teacher not found', 404);

    const { error } = await supabase
      .from('teachers')
      .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_deleted', entityType: 'teacher', entityId: params.id, request });

    return apiSuccess(null, 'Teacher deleted successfully');
  } catch (error) {
    console.error('Delete teacher error:', error);
    return apiError('An error occurred', 500);
  }
}
