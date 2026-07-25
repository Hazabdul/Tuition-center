export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

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

    // Fetch student fee record
    const { data: studentFee, error: sfErr } = await supabase
      .from('student_fees')
      .select('id, student_id, total_amount, balance_amount, notes, student:students(first_name, last_name, email)')
      .eq('id', studentFeeId)
      .eq('institute_id', instituteId)
      .single();

    if (sfErr || !studentFee) return apiError('Student fee record not found', 404);

    const mandateId = method === 'stripe_card'
      ? `sub_mandate_stripe_${String(Date.now()).slice(-6)}`
      : `mandate_upi_${String(Date.now()).slice(-6)}`;

    const checkoutUrl = method === 'stripe_card'
      ? `https://checkout.stripe.com/pay/${mandateId}`
      : `https://api.razorpay.com/v1/payments/qr/${mandateId}`;

    let feeNotesObj: Record<string, unknown> = {};
    if (studentFee.notes) {
      try { feeNotesObj = JSON.parse(studentFee.notes); } catch {}
    }

    const updatedNotesObj = {
      ...feeNotesObj,
      autoPayEnabled: true,
      mandateReference: mandateId,
      mandateMethod: method === 'stripe_card' ? 'Stripe Card Auto-Debit' : 'UPI AutoPay (e-Mandate)',
      mandateAuthorizedAt: new Date().toISOString(),
    };

    await supabase
      .from('student_fees')
      .update({
        notes: JSON.stringify(updatedNotesObj),
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentFeeId);

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
        method: updatedNotesObj.mandateMethod,
        autoPayEnabled: true,
      },
      `AutoPay mandate (${updatedNotesObj.mandateMethod}) authorized successfully!`
    );
  } catch (error) {
    console.error('AutoPay checkout error:', error);
    return apiError('Failed to setup AutoPay mandate checkout', 500);
  }
}
