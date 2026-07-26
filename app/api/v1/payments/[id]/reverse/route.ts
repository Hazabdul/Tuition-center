export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import FeePaymentDoc from '@/models/FeePayment';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid payment id', 400);

    const body = await request.json();
    const { reason } = body;

    await dbConnect();

    const payment = await FeePaymentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();

    if (!payment) return apiError('Payment not found', 404);
    if (payment.status === 'reversed') return apiError('Payment is already reversed', 400);

    await FeePaymentDoc.findByIdAndUpdate(params.id, {
      $set: { status: 'reversed' },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'payment_reversed',
      entityType: 'fee_payment',
      entityId: params.id,
      oldValues: { status: payment.status, amountPaid: payment.amountPaid } as Record<string, unknown>,
      newValues: { status: 'reversed', reason: reason || null },
      request,
    });

    return apiSuccess(
      { paymentId: params.id, status: 'reversed' },
      'Payment reversed successfully'
    );
  } catch (error) {
    console.error('Reverse payment error:', error);
    return apiError('An error occurred', 500);
  }
}
