export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const studentId = searchParams.get('studentId') || '';
    const method = searchParams.get('method') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const isReversed = searchParams.get('isReversed');

    let query = supabase
      .from('fee_payments')
      .select('id, institute_id, student_id, student_fee_id, amount_paid, payment_date, payment_method, reference_number, receipt_number, collected_by, is_reversed, notes, created_at, student:students(id, first_name, last_name, student_id, admission_number), student_fee:student_fees(id, total_amount, paid_amount, balance_amount, status)', { count: 'exact' })
      .eq('institute_id', user.instituteId);

    if (studentId) query = query.eq('student_id', studentId);
    if (method) query = query.eq('payment_method', method);
    if (startDate) query = query.gte('payment_date', startDate);
    if (endDate) query = query.lte('payment_date', endDate);
    if (isReversed === 'true') query = query.eq('is_reversed', true);
    if (isReversed === 'false') query = query.eq('is_reversed', false);
    if (search) {
      query = query.or(`receipt_number.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Payments fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
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
    const { studentId, studentFeeId, amountPaid, paymentDate, paymentMethod, referenceNumber, notes } = body;

    if (!studentId || !studentFeeId || !amountPaid || !paymentMethod) {
      return apiError('Student ID, student fee ID, amount paid, and payment method are required', 400);
    }

    if (amountPaid <= 0) return apiError('Amount paid must be greater than 0', 400);

    const validMethods = ['cash', 'cheque', 'card', 'bank_transfer', 'upi', 'online', 'other'];
    if (!validMethods.includes(paymentMethod)) {
      return apiError('Invalid payment method', 400);
    }

    const { data: studentFee, error: feeError } = await supabase
      .from('student_fees')
      .select('id, total_amount, discount_amount, waived_amount, paid_amount, balance_amount, status')
      .eq('id', studentFeeId)
      .eq('institute_id', user.instituteId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (feeError || !studentFee) return apiError('Student fee record not found', 404);

    if (studentFee.status === 'paid') return apiError('This fee is already fully paid', 400);

    if (amountPaid > studentFee.balance_amount) {
      return apiError(`Amount paid exceeds balance amount of ${studentFee.balance_amount}`, 400);
    }

    const newPaidAmount = studentFee.paid_amount + amountPaid;
    const newBalance = studentFee.balance_amount - amountPaid;
    let newStatus = 'unpaid';
    if (newBalance <= 0) newStatus = 'paid';
    else if (newPaidAmount > 0) newStatus = 'partial';

    const receiptNumber = generateReceiptNumber();

    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        institute_id: user.instituteId,
        student_id: studentId,
        student_fee_id: studentFeeId,
        amount_paid: amountPaid,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        receipt_number: receiptNumber,
        collected_by: user.id,
        is_reversed: false,
        notes: notes || null,
      })
      .select('id, institute_id, student_id, student_fee_id, amount_paid, payment_date, payment_method, reference_number, receipt_number, collected_by, is_reversed, notes, created_at')
      .single();

    if (paymentError) return apiError(paymentError.message, 400);

    await supabase
      .from('student_fees')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentFeeId);

    await supabase.from('fee_payment_audit_log').insert({
      institute_id: user.instituteId,
      payment_id: payment.id,
      action: 'payment_recorded',
      amount: amountPaid,
      performed_by: user.id,
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'payment_recorded',
      entityType: 'fee_payment',
      entityId: payment.id,
      newValues: { studentId, studentFeeId, amountPaid, paymentMethod, receiptNumber },
      request,
    });

    return apiSuccess(payment, 'Payment recorded successfully');
  } catch (error) {
    console.error('Create payment error:', error);
    return apiError('An error occurred', 500);
  }
}
