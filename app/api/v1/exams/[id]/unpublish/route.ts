export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: exam } = await supabase
      .from('exams')
      .select('id, status')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!exam) return apiError('Exam not found', 404);

    if (exam.status !== 'published') {
      return apiError('Exam results are not published', 400);
    }

    const { error: examError } = await supabase
      .from('exams')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (examError) return apiError(examError.message, 400);

    const { error: marksError } = await supabase
      .from('marks')
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq('exam_id', params.id)
      .eq('institute_id', user.instituteId);

    if (marksError) return apiError(marksError.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_results_unpublished',
      entityType: 'exam',
      entityId: params.id,
      oldValues: { status: 'published' },
      newValues: { status: 'completed' },
      request,
    });

    return apiSuccess(null, 'Exam results unpublished successfully');
  } catch (error) {
    console.error('Unpublish exam error:', error);
    return apiError('An error occurred', 500);
  }
}
