export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { status } = body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return apiError('Invalid status', 400);
    }

    const { data: existing } = await supabase.from('institutes').select('status').eq('id', params.id).maybeSingle();
    if (!existing) return apiError('Institute not found', 404);

    const { error } = await supabase
      .from('institutes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await logActivity({
      userId: user.id,
      action: 'institute_status_changed',
      entityType: 'institute',
      entityId: params.id,
      oldValues: { status: existing.status },
      newValues: { status },
      request,
    });

    return apiSuccess(null, `Institute ${status} successfully`);
  } catch (error) {
    console.error('Institute status error:', error);
    return apiError('An error occurred', 500);
  }
}
