export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { categoryId, batchId, academicYear, amount, dueDate, isActive } = body;

    const { data: existing } = await supabase
      .from('fee_structures')
      .select('id, category_id, batch_id, academic_year, amount, due_date, is_active')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Fee structure not found', 404);

    if (amount !== undefined && amount < 0) return apiError('Amount must be non-negative', 400);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (batchId !== undefined) updateData.batch_id = batchId || null;
    if (academicYear !== undefined) updateData.academic_year = academicYear;
    if (amount !== undefined) updateData.amount = amount;
    if (dueDate !== undefined) updateData.due_date = dueDate || null;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: structure, error } = await supabase
      .from('fee_structures')
      .update(updateData)
      .eq('id', params.id)
      .select('id, institute_id, category_id, batch_id, academic_year, amount, due_date, is_active, created_at, updated_at')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_structure_updated',
      entityType: 'fee_structure',
      entityId: params.id,
      oldValues: existing,
      newValues: body,
      request,
    });

    return apiSuccess(structure, 'Fee structure updated successfully');
  } catch (error) {
    console.error('Update fee structure error:', error);
    return apiError('An error occurred', 500);
  }
}
