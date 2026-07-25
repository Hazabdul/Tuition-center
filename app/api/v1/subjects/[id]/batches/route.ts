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
    const { batchId, batchIds } = body;
    const idsToAssign: string[] = Array.isArray(batchIds) ? batchIds : (batchId ? [batchId] : []);

    if (idsToAssign.length === 0) return apiError('batchId or batchIds array is required', 400);

    const { data: subject } = await supabase.from('subjects').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!subject) return apiError('Subject not found', 404);

    const { data: existingLinks } = await supabase
      .from('batch_subject')
      .select('batch_id')
      .eq('subject_id', params.id)
      .in('batch_id', idsToAssign);

    const existingSet = new Set(existingLinks?.map(l => l.batch_id) || []);
    const newBatchIds = idsToAssign.filter(bid => !existingSet.has(bid));

    if (newBatchIds.length === 0) return apiError('All selected batches are already linked to this subject', 409);

    const toInsert = newBatchIds.map(bid => ({
      batch_id: bid,
      subject_id: params.id,
      institute_id: user.instituteId,
    }));

    const { error } = await supabase.from('batch_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_batches_linked', entityType: 'subject', entityId: params.id, newValues: { batchIds: newBatchIds }, request });

    return apiSuccess({ linked: newBatchIds }, 'Batches linked to subject successfully');
  } catch (error) {
    console.error('Link batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) return apiError('batchId is required', 400);

    const { error } = await supabase
      .from('batch_subject')
      .delete()
      .eq('subject_id', params.id)
      .eq('batch_id', batchId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_batch_unlinked', entityType: 'subject', entityId: params.id, newValues: { batchId }, request });

    return apiSuccess(null, 'Batch unlinked from subject successfully');
  } catch (error) {
    console.error('Unlink batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}
