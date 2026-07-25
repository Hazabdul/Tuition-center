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
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) return apiError('studentIds array is required', 400);

    const { data: batch } = await supabase.from('batches').select('id, capacity').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!batch) return apiError('Batch not found', 404);

    const { data: existingLinks } = await supabase
      .from('student_batch')
      .select('student_id')
      .eq('batch_id', params.id);

    const existingIds = new Set(existingLinks?.map(l => l.student_id) || []);
    const newStudentIds = studentIds.filter((sid: string) => !existingIds.has(sid));

    if (newStudentIds.length === 0) return apiError('All selected students are already in this batch', 409);

    const capacity = (batch as Record<string, unknown>).capacity as number;
    if (capacity > 0 && existingIds.size + newStudentIds.length > capacity) {
      return apiError(`Batch capacity exceeded. Available: ${Math.max(0, capacity - existingIds.size)}, requested: ${newStudentIds.length}`, 400);
    }

    const { data: validStudents } = await supabase
      .from('students')
      .select('id')
      .in('id', newStudentIds)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const validIds = new Set(validStudents?.map(s => s.id) || []);
    const toInsert = newStudentIds.filter((sid: string) => validIds.has(sid)).map((sid: string) => ({
      student_id: sid, batch_id: params.id, institute_id: user.instituteId,
    }));

    if (toInsert.length === 0) return apiError('No valid students found to assign', 400);

    const { error } = await supabase.from('student_batch').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_students_assigned', entityType: 'batch', entityId: params.id, newValues: { studentIds: toInsert.map(t => t.student_id) }, request });

    return apiSuccess({ assigned: toInsert.map(t => t.student_id), skipped: studentIds.filter((sid: string) => !validIds.has(sid) || existingIds.has(sid)) }, 'Students assigned to batch successfully');
  } catch (error) {
    console.error('Assign batch students error:', error);
    return apiError('An error occurred', 500);
  }
}
