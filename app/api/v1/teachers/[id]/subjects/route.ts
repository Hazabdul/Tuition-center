export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: subjects, error } = await supabase
      .from('teacher_subject')
      .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
      .eq('teacher_id', params.id);

    if (error) return apiError(error.message, 400);

    const result = (subjects || []).map((s: any) => ({
      ...s.subject,
      maxMarks: s.subject?.max_marks,
      passingMarks: s.subject?.passing_marks,
      isActive: s.subject?.is_active,
    })).filter(Boolean);

    return apiSuccess(result, 'Teacher subjects fetched');
  } catch (error) {
    console.error('Get teacher subjects error:', error);
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
    const { subjectId, subjectIds, assignments } = body;

    let itemsToInsert: { subjectId: string; batchId?: string }[] = [];
    if (Array.isArray(assignments)) {
      itemsToInsert = assignments;
    } else if (Array.isArray(subjectIds)) {
      itemsToInsert = subjectIds.map(sid => ({ subjectId: sid }));
    } else if (subjectId) {
      itemsToInsert = [{ subjectId }];
    }

    if (itemsToInsert.length === 0) return apiError('subjectId, subjectIds, or assignments array is required', 400);

    const { data: teacher } = await supabase.from('teachers').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!teacher) return apiError('Teacher not found', 404);

    const reqSubjectIds = itemsToInsert.map(a => a.subjectId);

    const { data: existingLinks } = await supabase
      .from('teacher_subject')
      .select('subject_id, batch_id')
      .eq('teacher_id', params.id)
      .in('subject_id', reqSubjectIds);

    const existingSet = new Set(existingLinks?.map(l => `${l.subject_id}:${l.batch_id || ''}`) || []);

    const { data: validSubjects } = await supabase.from('subjects').select('id').in('id', reqSubjectIds).eq('institute_id', user.instituteId).is('deleted_at', null);
    const validSubjectIds = new Set(validSubjects?.map(s => s.id) || []);

    const toInsert = itemsToInsert
      .filter(a => {
        const key = `${a.subjectId}:${a.batchId || ''}`;
        return !existingSet.has(key) && validSubjectIds.has(a.subjectId);
      })
      .map(a => ({
        teacher_id: params.id, subject_id: a.subjectId, batch_id: a.batchId || null, institute_id: user.instituteId,
      }));

    if (toInsert.length === 0) return apiError('All selected subjects are already assigned to this teacher', 409);

    const { error } = await supabase.from('teacher_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_subjects_assigned', entityType: 'teacher', entityId: params.id, newValues: { assignments: toInsert }, request });

    return apiSuccess({ assigned: toInsert.length }, 'Subjects assigned to teacher successfully');
  } catch (error) {
    console.error('Assign teacher subjects error:', error);
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
      .from('teacher_subject')
      .delete()
      .eq('teacher_id', params.id)
      .eq('subject_id', subjectId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_subject_unlinked', entityType: 'teacher', entityId: params.id, newValues: { subjectId }, request });

    return apiSuccess(null, 'Subject unlinked from teacher successfully');
  } catch (error) {
    console.error('Unlink teacher subject error:', error);
    return apiError('An error occurred', 500);
  }
}
