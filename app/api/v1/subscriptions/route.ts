export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('institute_subscriptions')
      .select('id, status, start_date, expiry_date, institute:institutes(id, name, code, status), plan:subscription_plans(id, name, code)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Subscriptions fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List subscriptions error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { instituteId, planId, startDate, expiryDate, status } = body;

    if (!instituteId || !planId) return apiError('Institute and plan are required', 400);

    const { data: sub, error } = await supabase
      .from('institute_subscriptions')
      .insert({
        institute_id: instituteId,
        plan_id: planId,
        status: status || 'active',
        start_date: startDate || new Date().toISOString().split('T')[0],
        expiry_date: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (error) return apiError(error.message, 400);

    await supabase.from('subscription_history').insert({
      institute_id: instituteId,
      plan_id: planId,
      action: 'assigned',
      new_status: status || 'active',
      new_expiry: expiryDate,
      performed_by: user.id,
    });

    await logActivity({ userId: user.id, action: 'subscription_assigned', entityType: 'institute', entityId: instituteId, newValues: body, request });

    return apiSuccess(sub, 'Subscription assigned successfully');
  } catch (error) {
    console.error('Assign subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
