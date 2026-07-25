export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const { data: institute, error } = await supabase
      .from('institutes')
      .select('*')
      .eq('id', params.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !institute) return apiError('Institute not found', 404);

    const { data: subscription } = await supabase
      .from('institute_subscriptions')
      .select('id, status, start_date, expiry_date, plan:subscription_plans(*)')
      .eq('institute_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', params.id)
      .is('deleted_at', null);

    const { count: teacherCount } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', params.id)
      .is('deleted_at', null);

    const { count: adminCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', params.id)
      .eq('role', 'institute_admin')
      .is('deleted_at', null);

    const { data: subHistory } = await supabase
      .from('subscription_history')
      .select('id, action, old_status, new_status, old_expiry, new_expiry, created_at, plan:subscription_plans(name)')
      .eq('institute_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return apiSuccess({
      ...institute,
      subscription,
      usage: { students: studentCount || 0, teachers: teacherCount || 0, admins: adminCount || 0 },
      subscriptionHistory: subHistory || [],
    });
  } catch (error) {
    console.error('Get institute error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { name, email, phone, altPhone, address, city, stateRegion, country, postalCode, contactPersonName, contactPersonPhone, contactPersonEmail, studentLimit, teacherLimit, adminLimit, notes } = body;

    const { data: existing } = await supabase.from('institutes').select('*').eq('id', params.id).maybeSingle();
    if (!existing) return apiError('Institute not found', 404);

    const { data: institute, error } = await supabase
      .from('institutes')
      .update({
        name, email, phone, alt_phone: altPhone, address, city, state_region: stateRegion,
        country, postal_code: postalCode, contact_person_name: contactPersonName,
        contact_person_phone: contactPersonPhone, contact_person_email: contactPersonEmail,
        student_limit: studentLimit, teacher_limit: teacherLimit, admin_limit: adminLimit, notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ userId: user.id, action: 'institute_updated', entityType: 'institute', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(institute, 'Institute updated successfully');
  } catch (error) {
    console.error('Update institute error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const { error } = await supabase
      .from('institutes')
      .update({ status: 'deleted', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await logActivity({ userId: user.id, action: 'institute_deleted', entityType: 'institute', entityId: params.id, request });

    return apiSuccess(null, 'Institute deleted successfully');
  } catch (error) {
    console.error('Delete institute error:', error);
    return apiError('An error occurred', 500);
  }
}
