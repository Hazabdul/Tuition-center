export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { name, description, monthlyPrice, annualPrice, studentLimit, teacherLimit, adminLimit, trialDurationDays, features } = body;

    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        name, description, monthly_price: monthlyPrice, annual_price: annualPrice,
        student_limit: studentLimit, teacher_limit: teacherLimit, admin_limit: adminLimit,
        trial_duration_days: trialDurationDays, features, updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ userId: user.id, action: 'subscription_plan_updated', entityType: 'subscription_plan', entityId: params.id, newValues: body, request });

    return apiSuccess(data, 'Subscription plan updated');
  } catch (error) {
    console.error('Update plan error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { status } = body;

    const { error } = await supabase
      .from('subscription_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await logActivity({ userId: user.id, action: 'subscription_plan_status_changed', entityType: 'subscription_plan', entityId: params.id, newValues: { status }, request });

    return apiSuccess(null, `Plan ${status} successfully`);
  } catch (error) {
    console.error('Plan status error:', error);
    return apiError('An error occurred', 500);
  }
}
