export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import FeePaymentDoc from '@/models/FeePayment';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.studentId)) return apiError('Invalid student id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.studentId);

    const payments = await FeePaymentDoc.find({
      instituteId: instituteObjId,
      studentId: studentObjId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalPaid = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const fees = payments.map((p) => ({
      id: p._id.toString(),
      receiptNumber: p.receiptNumber,
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      status: p.status,
      createdAt: p.createdAt,
    }));

    return apiSuccess(
      {
        fees,
        summary: {
          totalFees: fees.length,
          totalPaid,
          totalBalance: 0,
        },
      },
      'Student fees fetched'
    );
  } catch (error) {
    console.error('Student fees error:', error);
    return apiError('An error occurred', 500);
  }
}
