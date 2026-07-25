export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentIds, categoryId, structureId, totalAmount, discountAmount, waivedAmount, dueDate, notes } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return apiError('Student IDs array is required', 400);
    }
    if (!categoryId) return apiError('Category ID is required', 400);
    if (totalAmount === undefined || totalAmount === null) {
      return apiError('Total amount is required', 400);
    }

    const discount = discountAmount || 0;
    const waived = waivedAmount || 0;
    const balance = totalAmount - discount - waived;

    if (balance < 0) return apiError('Balance cannot be negative (discount + waived exceeds total)', 400);

    let status = 'unpaid';
    if (balance <= 0) status = 'paid';

    const records = studentIds.map((studentId: string) => ({
      institute_id: user.instituteId,
      student_id: studentId,
      category_id: categoryId,
      structure_id: structureId || null,
      total_amount: totalAmount,
      discount_amount: discount,
      waived_amount: waived,
      paid_amount: 0,
      balance_amount: balance,
      due_date: dueDate || null,
      status,
      notes: notes || null,
    }));

    const { data: inserted, error } = await supabase
      .from('student_fees')
      .insert(records)
      .select('id, institute_id, student_id, category_id, structure_id, total_amount, discount_amount, waived_amount, paid_amount, balance_amount, due_date, status, notes, created_at, updated_at');

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fees_assigned',
      entityType: 'student_fee',
      newValues: { studentIds, categoryId, structureId, totalAmount, discount, waived, count: studentIds.length },
      request,
    });

    return apiSuccess(
      { assigned: inserted?.length || 0, records: inserted || [] },
      `Fees assigned to ${inserted?.length || 0} student(s) successfully`
    );
  } catch (error) {
    console.error('Assign fees error:', error);
    return apiError('An error occurred', 500);
  }
}
