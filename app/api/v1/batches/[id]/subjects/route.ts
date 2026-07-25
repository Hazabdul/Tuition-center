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
    const { subjectIds } = body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) return apiError('subjectIds array is required', 400);

    const { data: batch } = await supabase.from('batches').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!batch) return apiError('Batch not found', 404);

    const { data: existingLinks } = await supabase
      .from('batch_subject')
      .select('subject_id')
      .eq('batch_id', params.id);

    const existingIds = new Set(existingLinks?.map(l => l.subject_id) || []);
    const newSubjectIds = subjectIds.filter((sid: string) => !existingIds.has(sid));

    if (newSubjectIds.length === 0) return apiError('All selected subjects are already assigned to this batch', 409);

    const { data: validSubjects } = await supabase
      .from('subjects')
      .select('id')
      .in('id', newSubjectIds)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const validIds = new Set(validSubjects?.map(s => s.id) || []);
    const toInsert = newSubjectIds.filter((sid: string) => validIds.has(sid)).map((sid: string) => ({
      batch_id: params.id, subject_id: sid, institute_id: user.instituteId,
    }));

    if (toInsert.length === 0) return apiError('No valid subjects found to assign', 400);

    const { error } = await supabase.from('batch_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_subjects_assigned', entityType: 'batch', entityId: params.id, newValues: { subjectIds: toInsert.map(t => t.subject_id) }, request });

    return apiSuccess({ assigned: toInsert.map(t => t.subject_id), skipped: subjectIds.filter((sid: string) => !validIds.has(sid) || existingIds.has(sid)) }, 'Subjects assigned to batch successfully');
  } catch (error) {
    console.error('Assign batch subjects error:', error);
    return apiError('An error occurred', 500);
  }
}
