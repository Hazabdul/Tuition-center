export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json().catch(() => ({}));
    const { planId, expiryDate, notes } = body;

    const { data: institute } = await supabase
      .from('institutes')
      .select('id, name, code, status')
      .eq('id', params.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!institute) return apiError('Institute not found', 404);

    // 1. Activate Institute status
    const { error: instError } = await supabase
      .from('institutes')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (instError) return apiError(instError.message, 400);

    // 2. Activate Subscription
    const { data: existingSub } = await supabase
      .from('institute_subscriptions')
      .select('id, plan_id')
      .eq('institute_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetPlanId = planId || existingSub?.plan_id;
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const finalExpiry = expiryDate || defaultExpiry;

    if (existingSub) {
      await supabase
        .from('institute_subscriptions')
        .update({
          status: 'active',
          plan_id: targetPlanId,
          start_date: todayStr,
          expiry_date: finalExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);
    } else if (targetPlanId) {
      await supabase.from('institute_subscriptions').insert({
        institute_id: params.id,
        plan_id: targetPlanId,
        status: 'active',
        start_date: todayStr,
        expiry_date: finalExpiry,
      });
    }

    // Record Subscription History
    await supabase.from('subscription_history').insert({
      institute_id: params.id,
      plan_id: targetPlanId,
      action: 'activated_by_super_admin',
      old_status: institute.status,
      new_status: 'active',
      new_expiry: finalExpiry,
      notes: notes || 'Subscription plan verified & account activated by Super Admin',
      performed_by: user.id,
    });

    // 3. Activate all institute admin users
    await supabase
      .from('users')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('institute_id', params.id)
      .eq('role', 'institute_admin');

    await logActivity({
      userId: user.id,
      action: 'institute_account_activated',
      entityType: 'institute',
      entityId: params.id,
      newValues: { status: 'active', planId: targetPlanId, expiryDate: finalExpiry },
      request,
    });

    return apiSuccess({ id: params.id, status: 'active' }, 'Institute account and subscription activated successfully');
  } catch (error) {
    console.error('Activate institute error:', error);
    return apiError('An error occurred during activation', 500);
  }
}
