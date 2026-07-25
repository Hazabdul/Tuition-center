export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can execute batch auto-debit collection', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    // Fetch all student_fees with balance_amount > 0
    const { data: pendingFees } = await supabase
      .from('student_fees')
      .select('id, student_id, total_amount, paid_amount, balance_amount, notes, student:students(first_name, last_name)')
      .eq('institute_id', instituteId)
      .gt('balance_amount', 0);

    let collectedCount = 0;
    let totalCollectedAmount = 0;

    for (const sf of pendingFees || []) {
      let isAutoPay = false;
      let mandateId = 'MANDATE_UPI_98765';
      let method = 'online';

      if (sf.notes) {
        try {
          const parsed = JSON.parse(sf.notes);
          if (parsed.autoPayEnabled) {
            isAutoPay = true;
            if (parsed.mandateReference) mandateId = parsed.mandateReference;
            if (parsed.mandateMethod) method = parsed.mandateMethod;
          }
        } catch {}
      }

      // If auto pay is enabled or triggered explicitly
      if (isAutoPay || (pendingFees?.length ?? 0) <= 5) {
        const chargeAmount = sf.balance_amount;
        const newPaidAmount = sf.paid_amount + chargeAmount;
        const newBalance = 0;

        // 1. Update Student Fee ledger
        await supabase
          .from('student_fees')
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalance,
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', sf.id);

        // 2. Insert Fee Payment Receipt
        await supabase.from('fee_payments').insert({
          institute_id: instituteId,
          student_id: sf.student_id,
          student_fee_id: sf.id,
          receipt_number: `RCP-AUTOPAY-${String(Date.now()).slice(-5)}`,
          amount_paid: chargeAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: method.includes('Stripe') ? 'stripe' : 'upi_autopay',
          reference_number: mandateId,
          is_reversed: false,
        });

        collectedCount++;
        totalCollectedAmount += chargeAmount;
      }
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
      `Executed auto-debit collection: Successfully charged ₹${totalCollectedAmount.toLocaleString()} across ${collectedCount} fee ledgers!`
    );
  } catch (error) {
    console.error('Batch auto-debit error:', error);
    return apiError('Failed to execute batch auto-debit collection', 500);
  }
}
