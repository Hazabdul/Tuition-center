export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; studentId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existingLink } = await supabase
      .from('parent_student')
      .select('id')
      .eq('parent_id', params.id)
      .eq('student_id', params.studentId)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existingLink) return apiError('Link not found', 404);

    const { error } = await supabase
      .from('parent_student')
      .delete()
      .eq('parent_id', params.id)
      .eq('student_id', params.studentId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'parent_student_unlinked', entityType: 'parent', entityId: params.id, oldValues: { studentId: params.studentId }, request });

    return apiSuccess(null, 'Student unlinked from parent successfully');
  } catch (error) {
    console.error('Unlink student from parent error:', error);
    return apiError('An error occurred', 500);
  }
}
