export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import UserDoc from '@/models/User';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid institute id', 400);

    const body = await request.json().catch(() => ({}));
    const { planId, expiryDate } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(params.id);

    const institute = await InstituteDoc.findOne({
      _id: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!institute) return apiError('Institute not found', 404);

    // 1. Activate Institute status
    await InstituteDoc.findByIdAndUpdate(params.id, {
      $set: { status: 'active' },
    });

    // 2. Activate Subscription
    const existingSub = await InstituteSubscriptionDoc.findOne({ instituteId: instituteObjId })
      .sort({ createdAt: -1 });

    const targetPlanId = planId && mongoose.Types.ObjectId.isValid(planId)
      ? new mongoose.Types.ObjectId(planId)
      : existingSub?.planId;

    const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const finalExpiry = expiryDate ? new Date(expiryDate) : defaultExpiry;

    if (existingSub) {
      await InstituteSubscriptionDoc.findByIdAndUpdate(existingSub._id, {
        $set: {
          status: 'active',
          ...(targetPlanId && { planId: targetPlanId }),
          startDate: new Date(),
          expiryDate: finalExpiry,
        },
      });
    } else if (targetPlanId) {
      await InstituteSubscriptionDoc.create({
        instituteId: instituteObjId,
        planId: targetPlanId,
        status: 'active',
        startDate: new Date(),
        expiryDate: finalExpiry,
      });
    }

    // 3. Activate all institute admin users
    await UserDoc.updateMany(
      { instituteId: instituteObjId, role: 'institute_admin' },
      { $set: { isActive: true } }
    );

    await logActivity({
      userId: user.id,
      action: 'institute_account_activated',
      entityType: 'institute',
      entityId: params.id,
      newValues: { status: 'active', planId: targetPlanId, expiryDate: finalExpiry },
      request,
    });

    return apiSuccess(
      { id: params.id, status: 'active' },
      'Institute account and subscription activated successfully'
    );
  } catch (error) {
    console.error('Activate institute error:', error);
    return apiError('An error occurred during activation', 500);
  }
}
