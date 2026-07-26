export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid plan id', 400);

    const body = await request.json();
    const {
      name, description, monthlyPrice, annualPrice,
      studentLimit, teacherLimit, adminLimit, trialDurationDays, features,
    } = body;

    await dbConnect();

    const plan = await SubscriptionPlanDoc.findOneAndUpdate(
      { _id: params.id, deletedAt: null },
      {
        $set: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(monthlyPrice !== undefined && { monthlyPrice }),
          ...(annualPrice !== undefined && { annualPrice }),
          ...(studentLimit !== undefined && { studentLimit }),
          ...(teacherLimit !== undefined && { teacherLimit }),
          ...(adminLimit !== undefined && { adminLimit }),
          ...(trialDurationDays !== undefined && { trialDurationDays }),
          ...(features !== undefined && { features }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!plan) return apiError('Plan not found', 404);

    await logActivity({
      userId: user.id,
      action: 'subscription_plan_updated',
      entityType: 'subscription_plan',
      entityId: params.id,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: plan._id.toString(), name: plan.name, code: plan.code },
      'Subscription plan updated'
    );
  } catch (error) {
    console.error('Update plan error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid plan id', 400);

    const body = await request.json();
    const { status } = body;

    if (!['active', 'inactive'].includes(status)) {
      return apiError('Invalid status value', 400);
    }

    await dbConnect();

    const plan = await SubscriptionPlanDoc.findOneAndUpdate(
      { _id: params.id, deletedAt: null },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!plan) return apiError('Plan not found', 404);

    await logActivity({
      userId: user.id,
      action: 'subscription_plan_status_changed',
      entityType: 'subscription_plan',
      entityId: params.id,
      newValues: { status },
      request,
    });

    return apiSuccess(null, `Plan ${status} successfully`);
  } catch (error) {
    console.error('Plan status error:', error);
    return apiError('An error occurred', 500);
  }
}
