export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    const plans = await SubscriptionPlanDoc.find({ deletedAt: null })
      .sort({ monthlyPrice: 1 })
      .lean();

    const data = plans.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      code: p.code,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      annualPrice: p.annualPrice,
      studentLimit: p.studentLimit,
      teacherLimit: p.teacherLimit,
      adminLimit: p.adminLimit,
      trialDurationDays: p.trialDurationDays,
      features: p.features,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return apiSuccess(data, 'Subscription plans fetched');
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
    const {
      name, code, description, monthlyPrice, annualPrice,
      studentLimit, teacherLimit, adminLimit, trialDurationDays, features,
    } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    await dbConnect();

    const existing = await SubscriptionPlanDoc.findOne({
      code: code.toLowerCase().trim(),
      deletedAt: null,
    }).lean();
    if (existing) return apiError('Plan code already exists', 409);

    const plan = await SubscriptionPlanDoc.create({
      name: name.trim(),
      code: code.toLowerCase().trim(),
      description: description || null,
      monthlyPrice: monthlyPrice || 0,
      annualPrice: annualPrice || 0,
      studentLimit: studentLimit || 50,
      teacherLimit: teacherLimit || 10,
      adminLimit: adminLimit || 2,
      trialDurationDays: trialDurationDays || 14,
      features: features || null,
      status: 'active',
    });

    await logActivity({
      userId: user.id,
      action: 'subscription_plan_created',
      entityType: 'subscription_plan',
      entityId: plan._id.toString(),
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: plan._id.toString(), name: plan.name, code: plan.code },
      'Subscription plan created'
    );
  } catch (error) {
    console.error('Create plan error:', error);
    return apiError('An error occurred', 500);
  }
}
