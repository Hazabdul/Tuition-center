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
    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) return apiError('assignments array is required', 400);

    const { data: teacher } = await supabase.from('teachers').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!teacher) return apiError('Teacher not found', 404);

    const subjectIds = assignments.map((a: { subjectId: string; batchId?: string }) => a.subjectId);
    const batchIds = Array.from(new Set(assignments.map((a: { subjectId: string; batchId?: string }) => a.batchId).filter(Boolean))) as string[];

    const { data: existingLinks } = await supabase
      .from('teacher_subject')
      .select('subject_id, batch_id')
      .eq('teacher_id', params.id)
      .in('subject_id', subjectIds);

    const existingSet = new Set(existingLinks?.map(l => `${l.subject_id}:${l.batch_id || ''}`) || []);

    const { data: validSubjects } = await supabase.from('subjects').select('id').in('id', subjectIds).eq('institute_id', user.instituteId).is('deleted_at', null);
    const validSubjectIds = new Set(validSubjects?.map(s => s.id) || []);

    let validBatchIds = new Set<string>();
    if (batchIds.length > 0) {
      const { data: validBatches } = await supabase.from('batches').select('id').in('id', batchIds).eq('institute_id', user.instituteId).is('deleted_at', null);
      validBatchIds = new Set(validBatches?.map(b => b.id) || []);
    }

    const toInsert = assignments
      .filter((a: { subjectId: string; batchId?: string }) => {
        const key = `${a.subjectId}:${a.batchId || ''}`;
        return !existingSet.has(key) && validSubjectIds.has(a.subjectId) && (!a.batchId || validBatchIds.has(a.batchId));
      })
      .map((a: { subjectId: string; batchId?: string }) => ({
        teacher_id: params.id, subject_id: a.subjectId, batch_id: a.batchId || null, institute_id: user.instituteId,
      }));

    if (toInsert.length === 0) return apiError('All selected subjects are already assigned or invalid', 409);

    const { error } = await supabase.from('teacher_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_subjects_assigned', entityType: 'teacher', entityId: params.id, newValues: { assignments: toInsert }, request });

    return apiSuccess({ assigned: toInsert.length }, 'Subjects assigned to teacher successfully');
  } catch (error) {
    console.error('Assign teacher subjects error:', error);
    return apiError('An error occurred', 500);
  }
}
