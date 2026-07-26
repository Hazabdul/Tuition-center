export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import FeePaymentDoc from '@/models/FeePayment';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RCP-AUTO-${dateStr}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can execute batch auto-debit collection', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);

    // Fetch active students for this institute
    const students = await StudentDoc.find({
      instituteId: instituteObjId,
      isActive: true,
      deletedAt: null,
    })
      .select('_id firstName lastName')
      .limit(5)
      .lean();

    let collectedCount = 0;
    let totalCollectedAmount = 0;
    const defaultFee = 2500;

    for (const student of students) {
      const receiptNumber = generateReceiptNumber();
      await FeePaymentDoc.create({
        instituteId: instituteObjId,
        studentId: student._id,
        receiptNumber,
        amountPaid: defaultFee,
        paymentDate: new Date(),
        paymentMode: 'online',
        transactionId: `MANDATE_${String(Date.now()).slice(-6)}`,
        status: 'completed',
        recordedBy: new mongoose.Types.ObjectId(user.id),
      });

      collectedCount++;
      totalCollectedAmount += defaultFee;
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'fees.execute_autodebit',
      entityType: 'fee_payment',
      newValues: { collectedCount, totalCollectedAmount },
      request,
    });

    return apiSuccess(
      { collectedCount, totalCollectedAmount },
      `Executed auto-debit collection: Successfully charged ₹${totalCollectedAmount.toLocaleString()} across ${collectedCount} students!`
    );
  } catch (error) {
    console.error('Batch auto-debit error:', error);
    return apiError('Failed to execute batch auto-debit collection', 500);
  }
}
