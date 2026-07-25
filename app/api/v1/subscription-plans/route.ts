export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('monthly_price', { ascending: true });

    if (error) return apiError(error.message, 400);

    return apiSuccess(data || [], 'Subscription plans fetched');
  } catch (error) {
    console.error('List plans error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { name, code, description, monthlyPrice, annualPrice, studentLimit, teacherLimit, adminLimit, trialDurationDays, features } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const { data: existing } = await supabase.from('subscription_plans').select('id').eq('code', code).maybeSingle();
    if (existing) return apiError('Plan code already exists', 409);

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert({
        name, code, description, monthly_price: monthlyPrice || 0, annual_price: annualPrice || 0,
        student_limit: studentLimit || 50, teacher_limit: teacherLimit || 10, admin_limit: adminLimit || 2,
        trial_duration_days: trialDurationDays || 14, features, status: 'active',
      })
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ userId: user.id, action: 'subscription_plan_created', entityType: 'subscription_plan', entityId: plan.id, newValues: body, request });

    return apiSuccess(plan, 'Subscription plan created');
  } catch (error) {
    console.error('Create plan error:', error);
    return apiError('An error occurred', 500);
  }
}
