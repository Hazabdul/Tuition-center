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
    const { studentId, studentIds } = body;
    const idsToAssign: string[] = Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []);

    if (idsToAssign.length === 0) return apiError('studentId or studentIds array is required', 400);

    const { data: subject } = await supabase.from('subjects').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!subject) return apiError('Subject not found', 404);

    const { data: existingLinks } = await supabase
      .from('student_subject')
      .select('student_id')
      .eq('subject_id', params.id)
      .in('student_id', idsToAssign);

    const existingSet = new Set(existingLinks?.map(l => l.student_id) || []);
    const newStudentIds = idsToAssign.filter(sid => !existingSet.has(sid));

    if (newStudentIds.length === 0) return apiError('All selected students are already linked to this subject', 409);

    const toInsert = newStudentIds.map(sid => ({
      student_id: sid,
      subject_id: params.id,
      institute_id: user.instituteId,
    }));

    const { error } = await supabase.from('student_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_students_linked', entityType: 'subject', entityId: params.id, newValues: { studentIds: newStudentIds }, request });

    return apiSuccess({ linked: newStudentIds }, 'Students linked to subject successfully');
  } catch (error) {
    console.error('Link student subject error:', error);
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
    const studentId = searchParams.get('studentId');

    if (!studentId) return apiError('studentId is required', 400);

    const { error } = await supabase
      .from('student_subject')
      .delete()
      .eq('subject_id', params.id)
      .eq('student_id', studentId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_student_unlinked', entityType: 'subject', entityId: params.id, newValues: { studentId }, request });

    return apiSuccess(null, 'Student unlinked from subject successfully');
  } catch (error) {
    console.error('Unlink student subject error:', error);
    return apiError('An error occurred', 500);
  }
}
