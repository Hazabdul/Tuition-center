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
  return `RCP-${dateStr}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const studentId = searchParams.get('studentId') || '';
    const method = searchParams.get('method') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const isReversed = searchParams.get('isReversed');

    const filter: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    };

    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      filter.studentId = new mongoose.Types.ObjectId(studentId);
    }
    if (method) filter.paymentMode = method;
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.paymentDate = dateFilter;
    }
    if (isReversed === 'true') filter.status = 'reversed';
    if (isReversed === 'false') filter.status = { $ne: 'reversed' };

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      FeePaymentDoc.find(filter)
        .populate('studentId', '_id firstName lastName studentId admissionNumber')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      FeePaymentDoc.countDocuments(filter),
    ]);

    const data = records.map((p) => ({
      id: p._id.toString(),
      instituteId: p.instituteId.toString(),
      studentId: p.studentId,
      batchId: p.batchId?.toString() ?? null,
      receiptNumber: p.receiptNumber,
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      transactionId: p.transactionId ?? null,
      notes: p.notes ?? null,
      status: p.status,
      recordedBy: p.recordedBy?.toString() ?? null,
      createdAt: p.createdAt,
    }));

    return apiSuccess(data, 'Payments fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List payments error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentId, batchId, amountPaid, paymentDate, paymentMode, transactionId, notes } = body;

    if (!studentId || !amountPaid || !paymentMode) {
      return apiError('Student ID, amount paid, and payment mode are required', 400);
    }
    if (Number(amountPaid) <= 0) return apiError('Amount paid must be greater than 0', 400);

    const validModes = ['cash', 'card', 'online', 'cheque', 'bank_transfer'];
    if (!validModes.includes(paymentMode)) {
      return apiError(`Invalid payment mode. Must be one of: ${validModes.join(', ')}`, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) return apiError('Invalid studentId', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const student = await StudentDoc.findOne({
      _id: studentId,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();
    if (!student) return apiError('Student not found', 404);

    const receiptNumber = generateReceiptNumber();

    const payment = await FeePaymentDoc.create({
      instituteId: instituteObjId,
      studentId: new mongoose.Types.ObjectId(studentId),
      batchId: batchId && mongoose.Types.ObjectId.isValid(batchId)
        ? new mongoose.Types.ObjectId(batchId)
        : null,
      receiptNumber,
      amountPaid: Number(amountPaid),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMode,
      transactionId: transactionId || null,
      notes: notes || null,
      status: 'completed',
      recordedBy: new mongoose.Types.ObjectId(user.id),
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'payment_recorded',
      entityType: 'fee_payment',
      entityId: payment._id.toString(),
      newValues: { studentId, amountPaid, paymentMode, receiptNumber },
      request,
    });

    return apiSuccess(
      {
        id: payment._id.toString(),
        receiptNumber: payment.receiptNumber,
        amountPaid: payment.amountPaid,
        paymentMode: payment.paymentMode,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      'Payment recorded successfully'
    );
  } catch (error) {
    console.error('Create payment error:', error);
    return apiError('An error occurred', 500);
  }
}
