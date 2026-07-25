export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('student_fees')
      .select('id, institute_id, student_id, category_id, structure_id, total_amount, discount_amount, waived_amount, paid_amount, balance_amount, due_date, status, notes, created_at, updated_at, category:fee_categories(id, name, code), structure:fee_structures(id, amount, due_date, academic_year)')
      .eq('institute_id', user.instituteId)
      .eq('student_id', params.studentId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) return apiError(error.message, 400);

    const fees = data || [];
    const totalAmount = fees.reduce((sum, f) => sum + (f.total_amount || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
    const totalBalance = fees.reduce((sum, f) => sum + (f.balance_amount || 0), 0);
    const totalDiscount = fees.reduce((sum, f) => sum + (f.discount_amount || 0), 0);
    const totalWaived = fees.reduce((sum, f) => sum + (f.waived_amount || 0), 0);

    return apiSuccess(
      {
        fees,
        summary: {
          totalFees: fees.length,
          totalAmount,
          totalPaid,
          totalBalance,
          totalDiscount,
          totalWaived,
        },
      },
      'Student fees fetched'
    );
  } catch (error) {
    console.error('Student fees error:', error);
    return apiError('An error occurred', 500);
  }
}
