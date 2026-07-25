export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: parent, error } = await supabase
      .from('parents')
      .select('*')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !parent) return apiError('Parent not found', 404);

    const { data: children } = await supabase
      .from('parent_student')
      .select('student:students(id, student_id, admission_number, first_name, last_name, email, phone, is_active)')
      .eq('parent_id', params.id);

    return apiSuccess({
      ...parent,
      children: children?.map(c => c.student) || [],
    });
  } catch (error) {
    console.error('Get parent error:', error);
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
    const { firstName, lastName, email, phone, altPhone, address, relationship, occupation, notes } = body;

    const { data: existing } = await supabase.from('parents').select('*').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Parent not found', 404);

    const { data: parent, error } = await supabase
      .from('parents')
      .update({
        first_name: firstName, last_name: lastName,
        email, phone, alt_phone: altPhone, address,
        relationship, occupation, notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, first_name, last_name')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'parent_updated', entityType: 'parent', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(parent, 'Parent updated successfully');
  } catch (error) {
    console.error('Update parent error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existing } = await supabase.from('parents').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Parent not found', 404);

    const { error } = await supabase
      .from('parents')
      .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'parent_deleted', entityType: 'parent', entityId: params.id, request });

    return apiSuccess(null, 'Parent deleted successfully');
  } catch (error) {
    console.error('Delete parent error:', error);
    return apiError('An error occurred', 500);
  }
}
