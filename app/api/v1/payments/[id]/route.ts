export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import FeePaymentDoc from '@/models/FeePayment';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid payment id', 400);

    await dbConnect();

    const payment = await FeePaymentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    })
      .populate('studentId', '_id firstName lastName studentId admissionNumber')
      .populate('recordedBy', '_id firstName lastName')
      .lean();

    if (!payment) return apiError('Payment not found', 404);

    return apiSuccess({
      id: payment._id.toString(),
      instituteId: payment.instituteId.toString(),
      studentId: payment.studentId,
      batchId: payment.batchId?.toString() ?? null,
      receiptNumber: payment.receiptNumber,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
      paymentMode: payment.paymentMode,
      transactionId: payment.transactionId ?? null,
      notes: payment.notes ?? null,
      status: payment.status,
      recordedBy: payment.recordedBy,
      createdAt: payment.createdAt,
    }, 'Payment fetched successfully');
  } catch (error) {
    console.error('Get payment error:', error);
    return apiError('An error occurred', 500);
  }
}
