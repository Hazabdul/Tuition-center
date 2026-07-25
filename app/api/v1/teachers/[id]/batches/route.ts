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
    const { batchIds } = body;

    if (!Array.isArray(batchIds) || batchIds.length === 0) return apiError('batchIds array is required', 400);

    const { data: teacher } = await supabase.from('teachers').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!teacher) return apiError('Teacher not found', 404);

    const { data: existingLinks } = await supabase
      .from('teacher_batch')
      .select('batch_id')
      .eq('teacher_id', params.id)
      .in('batch_id', batchIds);

    const existingIds = new Set(existingLinks?.map(l => l.batch_id) || []);
    const newBatchIds = batchIds.filter((bid: string) => !existingIds.has(bid));

    if (newBatchIds.length === 0) return apiError('All selected batches are already assigned to this teacher', 409);

    const { data: validBatches } = await supabase
      .from('batches')
      .select('id')
      .in('id', newBatchIds)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const validIds = new Set(validBatches?.map(b => b.id) || []);
    const toInsert = newBatchIds.filter((bid: string) => validIds.has(bid)).map((bid: string) => ({
      teacher_id: params.id, batch_id: bid, institute_id: user.instituteId,
    }));

    if (toInsert.length === 0) return apiError('No valid batches found to assign', 400);

    const { error } = await supabase.from('teacher_batch').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_batches_assigned', entityType: 'teacher', entityId: params.id, newValues: { batchIds: toInsert.map(t => t.batch_id) }, request });

    return apiSuccess({ assigned: toInsert.map(t => t.batch_id), skipped: batchIds.filter((bid: string) => !validIds.has(bid) || existingIds.has(bid)) }, 'Batches assigned to teacher successfully');
  } catch (error) {
    console.error('Assign teacher batches error:', error);
    return apiError('An error occurred', 500);
  }
}
