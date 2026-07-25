export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: payment, error } = await supabase
      .from('fee_payments')
      .select('id, institute_id, student_id, student_fee_id, amount_paid, payment_date, payment_method, reference_number, receipt_number, collected_by, is_reversed, notes, created_at, student:students(id, first_name, last_name, student_id, admission_number), student_fee:student_fees(id, total_amount, discount_amount, waived_amount, paid_amount, balance_amount, status, category:fee_categories(id, name, code))')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (error || !payment) return apiError('Payment not found', 404);

    return apiSuccess(payment, 'Payment fetched successfully');
  } catch (error) {
    console.error('Get payment error:', error);
    return apiError('An error occurred', 500);
  }
}
