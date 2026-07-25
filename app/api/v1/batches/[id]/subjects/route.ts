export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: subjects, error } = await supabase
      .from('batch_subject')
      .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
      .eq('batch_id', params.id);

    if (error) return apiError(error.message, 400);

    const result = (subjects || []).map((s: any) => ({
      ...s.subject,
      maxMarks: s.subject?.max_marks,
      passingMarks: s.subject?.passing_marks,
      isActive: s.subject?.is_active,
    })).filter(Boolean);

    return apiSuccess(result, 'Batch subjects fetched');
  } catch (error) {
    console.error('Get batch subjects error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { subjectId, subjectIds } = body;
    const idsToAssign: string[] = Array.isArray(subjectIds) ? subjectIds : (subjectId ? [subjectId] : []);

    if (idsToAssign.length === 0) return apiError('subjectId or subjectIds array is required', 400);

    const { data: batch } = await supabase.from('batches').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!batch) return apiError('Batch not found', 404);

    const { data: existingLinks } = await supabase
      .from('batch_subject')
      .select('subject_id')
      .eq('batch_id', params.id)
      .in('subject_id', idsToAssign);

    const existingIds = new Set(existingLinks?.map(l => l.subject_id) || []);
    const newSubjectIds = idsToAssign.filter((sid: string) => !existingIds.has(sid));

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

    return apiSuccess({ assigned: toInsert.map(t => t.subject_id) }, 'Subjects assigned to batch successfully');
  } catch (error) {
    console.error('Assign batch subjects error:', error);
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
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) return apiError('subjectId is required', 400);

    const { error } = await supabase
      .from('batch_subject')
      .delete()
      .eq('batch_id', params.id)
      .eq('subject_id', subjectId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_subject_unlinked', entityType: 'batch', entityId: params.id, newValues: { subjectId }, request });

    return apiSuccess(null, 'Subject unlinked from batch successfully');
  } catch (error) {
    console.error('Unlink batch subject error:', error);
    return apiError('An error occurred', 500);
  }
}
