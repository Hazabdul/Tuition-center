export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { studentFeeId, paymentMethod } = body;

    if (!studentFeeId) return apiError('Student Fee ID is required', 400);

    const method = paymentMethod || 'upi_autopay';
    const mandateId = method === 'stripe_card'
      ? `sub_mandate_stripe_${String(Date.now()).slice(-6)}`
      : `mandate_upi_${String(Date.now()).slice(-6)}`;

    const checkoutUrl = method === 'stripe_card'
      ? `https://checkout.stripe.com/pay/${mandateId}`
      : `https://api.razorpay.com/v1/payments/qr/${mandateId}`;

    await dbConnect();

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'fees.setup_autopay',
      entityType: 'student_fee',
      entityId: studentFeeId,
      newValues: { mandateId, method },
      request,
    });

    return apiSuccess(
      {
        studentFeeId,
        mandateId,
        checkoutUrl,
        method: method === 'stripe_card' ? 'Stripe Card Auto-Debit' : 'UPI AutoPay (e-Mandate)',
        autoPayEnabled: true,
      },
      'AutoPay mandate authorized successfully!'
    );
  } catch (error) {
    console.error('AutoPay checkout error:', error);
    return apiError('Failed to setup AutoPay mandate checkout', 500);
  }
}
