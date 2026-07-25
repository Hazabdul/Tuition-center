export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { expiryDate, planId } = body;

    const { data: existing } = await supabase
      .from('institute_subscriptions')
      .select('id, status, expiry_date, plan_id, institute_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!existing) return apiError('Subscription not found', 404);

    const { error } = await supabase
      .from('institute_subscriptions')
      .update({
        status: 'active',
        expiry_date: expiryDate,
        plan_id: planId || existing.plan_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await supabase.from('subscription_history').insert({
      institute_id: existing.institute_id,
      plan_id: planId || existing.plan_id,
      action: 'renewed',
      old_status: existing.status,
      new_status: 'active',
      old_expiry: existing.expiry_date,
      new_expiry: expiryDate,
      performed_by: user.id,
    });

    await logActivity({ userId: user.id, action: 'subscription_renewed', entityType: 'subscription', entityId: params.id, newValues: body, request });

    return apiSuccess(null, 'Subscription renewed successfully');
  } catch (error) {
    console.error('Renew subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
