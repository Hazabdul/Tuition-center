export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') return apiError('isActive (boolean) is required', 400);

    const { data: existing } = await supabase.from('parents').select('id, is_active').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!existing) return apiError('Parent not found', 404);

    const { data: parent, error } = await supabase
      .from('parents')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, is_active')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId, userId: user.id,
      action: isActive ? 'parent_activated' : 'parent_deactivated',
      entityType: 'parent', entityId: params.id,
      oldValues: existing, newValues: { is_active: isActive }, request,
    });

    return apiSuccess(parent, `Parent ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Update parent status error:', error);
    return apiError('An error occurred', 500);
  }
}
