export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { reason } = body;

    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .select('id, institute_id, student_id, student_fee_id, amount_paid, is_reversed, receipt_number')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (paymentError || !payment) return apiError('Payment not found', 404);
    if (payment.is_reversed) return apiError('Payment is already reversed', 400);

    const { error: reverseError } = await supabase
      .from('fee_payments')
      .update({ is_reversed: true })
      .eq('id', params.id);

    if (reverseError) return apiError(reverseError.message, 400);

    const { data: studentFee, error: feeError } = await supabase
      .from('student_fees')
      .select('id, total_amount, paid_amount, balance_amount, status')
      .eq('id', payment.student_fee_id)
      .maybeSingle();

    if (feeError || !studentFee) {
      console.error('Student fee not found for reversed payment');
    } else {
      const newPaidAmount = studentFee.paid_amount - payment.amount_paid;
      const newBalance = studentFee.balance_amount + payment.amount_paid;
      let newStatus = 'unpaid';
      if (newPaidAmount > 0) newStatus = 'partial';

      await supabase
        .from('student_fees')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.student_fee_id);
    }

    await supabase.from('fee_payment_audit_log').insert({
      institute_id: user.instituteId,
      payment_id: params.id,
      action: 'payment_reversed',
      amount: payment.amount_paid,
      performed_by: user.id,
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'payment_reversed',
      entityType: 'fee_payment',
      entityId: params.id,
      oldValues: { isReversed: false, amount: payment.amount_paid },
      newValues: { isReversed: true, reason: reason || null },
      request,
    });

    return apiSuccess({ paymentId: params.id, isReversed: true }, 'Payment reversed successfully');
  } catch (error) {
    console.error('Reverse payment error:', error);
    return apiError('An error occurred', 500);
  }
}
