export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import InstituteDoc from '@/models/Institute';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || '';

    const filter: Record<string, unknown> = {
      deletedAt: null,
    };
    if (status) filter.status = status;

    const [subs, total] = await Promise.all([
      InstituteSubscriptionDoc.find(filter)
        .populate('instituteId', 'id name code status')
        .populate('planId', 'id name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InstituteSubscriptionDoc.countDocuments(filter),
    ]);

    const data = subs.map((s) => ({
      id: s._id.toString(),
      status: s.status,
      startDate: s.startDate,
      expiryDate: s.expiryDate,
      institute: s.instituteId,
      plan: s.planId,
      createdAt: s.createdAt,
    }));

    return apiSuccess(data, 'Subscriptions fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
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
    if (!mongoose.Types.ObjectId.isValid(instituteId)) return apiError('Invalid instituteId', 400);
    if (!mongoose.Types.ObjectId.isValid(planId)) return apiError('Invalid planId', 400);

    await dbConnect();

    const [institute, plan] = await Promise.all([
      InstituteDoc.findOne({ _id: instituteId, deletedAt: null }).lean(),
      SubscriptionPlanDoc.findOne({ _id: planId, deletedAt: null }).lean(),
    ]);

    if (!institute) return apiError('Institute not found', 404);
    if (!plan) return apiError('Subscription plan not found', 404);

    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

    const sub = await InstituteSubscriptionDoc.create({
      instituteId,
      planId,
      status: status || 'active',
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : defaultExpiry,
      performedBy: user.id,
    });

    await logActivity({
      userId: user.id,
      action: 'subscription_assigned',
      entityType: 'institute',
      entityId: instituteId,
      newValues: body,
      request,
    });

    return apiSuccess({ id: sub._id.toString() }, 'Subscription assigned successfully');
  } catch (error) {
    console.error('Assign subscription error:', error);
    return apiError('An error occurred', 500);
  }
}
