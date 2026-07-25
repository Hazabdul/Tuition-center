export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);

    const body = await request.json();
    const { isActive } = body;

    const { data: existing } = await supabase.from('students').select('is_active').eq('id', params.id).eq('institute_id', user.instituteId).maybeSingle();
    if (!existing) return apiError('Student not found', 404);

    const { error } = await supabase
      .from('students')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_status_changed', entityType: 'student', entityId: params.id, oldValues: existing, newValues: { isActive }, request });

    return apiSuccess(null, `Student ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Student status error:', error);
    return apiError('An error occurred', 500);
  }
}
