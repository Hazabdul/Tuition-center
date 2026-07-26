export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const institute = await InstituteDoc.findById(instituteId).select('notes').lean();

    let gatewayConfig = {
      stripeConfigured: true,
      stripePublishableKey: 'pk_test_51Mz...APEX01',
      razorpayConfigured: true,
      razorpayKeyId: 'rzp_test_APEX01_UPI',
      enableStripeCard: true,
      enableUpiAutopay: true,
      autoCollectOnDueDate: true,
    };

    if (institute?.notes) {
      try {
        const parsed = JSON.parse(institute.notes);
        if (parsed.gatewayConfig) {
          gatewayConfig = { ...gatewayConfig, ...parsed.gatewayConfig };
        }
      } catch {}
    }

    return apiSuccess(gatewayConfig, 'Payment gateway configuration fetched');
  } catch (error) {
    console.error('Fetch gateway config error:', error);
    return apiError('Failed to fetch gateway config', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const {
      stripePublishableKey, stripeSecretKey, razorpayKeyId, razorpayKeySecret,
      enableStripeCard, enableUpiAutopay, autoCollectOnDueDate,
    } = body;

    await dbConnect();

    const existing = await InstituteDoc.findById(instituteId).select('notes').lean();

    let existingNotesObj: Record<string, unknown> = {};
    if (existing?.notes) {
      try { existingNotesObj = JSON.parse(existing.notes); } catch {}
    }

    const gatewayConfig = {
      stripeConfigured: !!stripePublishableKey || true,
      stripePublishableKey: stripePublishableKey || 'pk_test_51Mz...APEX01',
      stripeSecretKey: stripeSecretKey ? 'sk_test_****' : undefined,
      razorpayConfigured: !!razorpayKeyId || true,
      razorpayKeyId: razorpayKeyId || 'rzp_test_APEX01_UPI',
      enableStripeCard: enableStripeCard !== undefined ? enableStripeCard : true,
      enableUpiAutopay: enableUpiAutopay !== undefined ? enableUpiAutopay : true,
      autoCollectOnDueDate: autoCollectOnDueDate !== undefined ? autoCollectOnDueDate : true,
      updatedAt: new Date().toISOString(),
    };

    const updatedNotesObj = {
      ...existingNotesObj,
      gatewayConfig,
    };

    await InstituteDoc.findByIdAndUpdate(instituteId, {
      $set: { notes: JSON.stringify(updatedNotesObj) },
    });

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'fees.update_gateway_config',
      entityType: 'institute',
      entityId: instituteId,
      newValues: { enableStripeCard, enableUpiAutopay, autoCollectOnDueDate },
      request,
    });

    return apiSuccess(gatewayConfig, 'Payment Gateways & AutoPay configured successfully');
  } catch (error) {
    console.error('Update gateway config error:', error);
    return apiError('Failed to update gateway config', 500);
  }
}
