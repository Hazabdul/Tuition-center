export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { parentId } = body;

    if (!parentId) return apiError('parentId is required', 400);

    const studentId = params.id;

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!student) return apiError('Student not found', 404);

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('id', parentId)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!parent) return apiError('Parent not found', 404);

    const { data: existingLink } = await supabase
      .from('parent_student')
      .select('id')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingLink) return apiError('Parent is already linked to this student', 409);

    const { data: link, error } = await supabase
      .from('parent_student')
      .insert({
        parent_id: parentId,
        student_id: studentId,
        institute_id: user.instituteId,
      })
      .select('id, parent_id, student_id')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_student_linked',
      entityType: 'student',
      entityId: studentId,
      newValues: { parentId },
      request,
    });

    return apiSuccess(link, 'Parent linked to student successfully');
  } catch (error) {
    console.error('Link parent to student error:', error);
    return apiError('An error occurred', 500);
  }
}
