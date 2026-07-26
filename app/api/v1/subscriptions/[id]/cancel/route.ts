export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subscription id', 400);

    await dbConnect();

    const existing = await InstituteSubscriptionDoc.findOne({
      _id: params.id,
      deletedAt: null,
    }).lean();

    if (!existing) return apiError('Subscription not found', 404);
    if (existing.status === 'cancelled') return apiError('Subscription is already cancelled', 400);

    await InstituteSubscriptionDoc.findByIdAndUpdate(params.id, {
      $set: { status: 'cancelled', performedBy: new mongoose.Types.ObjectId(user.id) },
    });

    await logActivity({
      userId: user.id,
      action: 'subscription_cancelled',
      entityType: 'subscription',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Subscription cancelled');
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
