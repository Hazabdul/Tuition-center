export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled', 'published'],
  scheduled: ['completed', 'published', 'draft'],
  completed: ['published', 'draft'],
  published: ['draft', 'scheduled', 'completed'],
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['draft', 'scheduled', 'completed', 'published'];
    if (!status || !validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: draft, scheduled, completed, published', 400);
    }

    const { data: existing } = await supabase
      .from('exams')
      .select('id, status, name, code')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Exam not found', 404);

    if (existing.status === status) {
      return apiError(`Exam is already in ${status} status`, 400);
    }

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return apiError(`Cannot transition from ${existing.status} to ${status}. Valid transitions: ${existing.status} -> ${allowed.join(' -> ')}`, 400);
    }

    const { data: exam, error } = await supabase
      .from('exams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_status_changed',
      entityType: 'exam',
      entityId: params.id,
      oldValues: { status: existing.status },
      newValues: { status },
      request,
    });

    return apiSuccess(exam, `Exam status updated to ${status} successfully`);
  } catch (error) {
    console.error('Exam status error:', error);
    return apiError('An error occurred', 500);
  }
}
