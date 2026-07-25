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
    const { name, code, description, isActive } = body;

    const { data: existing } = await supabase
      .from('fee_categories')
      .select('id, name, code, description, is_active')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Fee category not found', 404);

    if (code && code !== existing.code) {
      const { data: existingCode } = await supabase
        .from('fee_categories')
        .select('id')
        .eq('institute_id', user.instituteId)
        .eq('code', code)
        .neq('id', params.id)
        .maybeSingle();

      if (existingCode) return apiError('Fee category with this code already exists in the institute', 409);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: category, error } = await supabase
      .from('fee_categories')
      .update(updateData)
      .eq('id', params.id)
      .select('id, institute_id, name, code, description, is_active, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError('Fee category with this code already exists in the institute', 409);
      }
      return apiError(error.message, 400);
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_category_updated',
      entityType: 'fee_category',
      entityId: params.id,
      oldValues: existing,
      newValues: body,
      request,
    });

    return apiSuccess(category, 'Fee category updated successfully');
  } catch (error) {
    console.error('Update fee category error:', error);
    return apiError('An error occurred', 500);
  }
}
