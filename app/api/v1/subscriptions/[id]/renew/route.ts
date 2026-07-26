export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subscription id', 400);

    const body = await request.json();
    const { expiryDate, planId } = body;

    if (!expiryDate) return apiError('expiryDate is required', 400);

    await dbConnect();

    const existing = await InstituteSubscriptionDoc.findOne({
      _id: params.id,
      deletedAt: null,
    }).lean();

    if (!existing) return apiError('Subscription not found', 404);

    const newPlanId = planId && mongoose.Types.ObjectId.isValid(planId)
      ? new mongoose.Types.ObjectId(planId)
      : existing.planId;

    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      const plan = await SubscriptionPlanDoc.findOne({ _id: planId, deletedAt: null }).lean();
      if (!plan) return apiError('Plan not found', 404);
    }

    await InstituteSubscriptionDoc.findByIdAndUpdate(params.id, {
      $set: {
        status: 'active',
        expiryDate: new Date(expiryDate),
        planId: newPlanId,
        performedBy: new mongoose.Types.ObjectId(user.id),
      },
    });

    await logActivity({
      userId: user.id,
      action: 'subscription_renewed',
      entityType: 'subscription',
      entityId: params.id,
      newValues: body,
      request,
    });

    return apiSuccess(null, 'Subscription renewed successfully');
  } catch (error) {
    console.error('Renew subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
