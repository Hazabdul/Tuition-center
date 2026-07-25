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
    const { teacherIds } = body;

    if (!Array.isArray(teacherIds) || teacherIds.length === 0) return apiError('teacherIds array is required', 400);

    const { data: batch } = await supabase.from('batches').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!batch) return apiError('Batch not found', 404);

    const { data: existingLinks } = await supabase
      .from('teacher_batch')
      .select('teacher_id')
      .eq('batch_id', params.id);

    const existingIds = new Set(existingLinks?.map(l => l.teacher_id) || []);
    const newTeacherIds = teacherIds.filter((tid: string) => !existingIds.has(tid));

    if (newTeacherIds.length === 0) return apiError('All selected teachers are already assigned to this batch', 409);

    const { data: validTeachers } = await supabase
      .from('teachers')
      .select('id')
      .in('id', newTeacherIds)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const validIds = new Set(validTeachers?.map(t => t.id) || []);
    const toInsert = newTeacherIds.filter((tid: string) => validIds.has(tid)).map((tid: string) => ({
      teacher_id: tid, batch_id: params.id, institute_id: user.instituteId,
    }));

    if (toInsert.length === 0) return apiError('No valid teachers found to assign', 400);

    const { error } = await supabase.from('teacher_batch').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_teachers_assigned', entityType: 'batch', entityId: params.id, newValues: { teacherIds: toInsert.map(t => t.teacher_id) }, request });

    return apiSuccess({ assigned: toInsert.map(t => t.teacher_id), skipped: teacherIds.filter((tid: string) => !validIds.has(tid) || existingIds.has(tid)) }, 'Teachers assigned to batch successfully');
  } catch (error) {
    console.error('Assign batch teachers error:', error);
    return apiError('An error occurred', 500);
  }
}
