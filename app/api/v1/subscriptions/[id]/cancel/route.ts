export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const { data: existing } = await supabase
      .from('institute_subscriptions')
      .select('id, status, institute_id, plan_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!existing) return apiError('Subscription not found', 404);

    const { error } = await supabase
      .from('institute_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await supabase.from('subscription_history').insert({
      institute_id: existing.institute_id,
      plan_id: existing.plan_id,
      action: 'cancelled',
      old_status: existing.status,
      new_status: 'cancelled',
      performed_by: user.id,
    });

    await logActivity({ userId: user.id, action: 'subscription_cancelled', entityType: 'subscription', entityId: params.id, request });

    return apiSuccess(null, 'Subscription cancelled');
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
