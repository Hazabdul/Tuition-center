export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    // 1. Direct student subjects
    const { data: directSubjects } = await supabase
      .from('student_subject')
      .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
      .eq('student_id', params.id);

    // 2. Batch inherited subjects
    const { data: studentBatches } = await supabase
      .from('student_batch')
      .select('batch_id')
      .eq('student_id', params.id);

    const batchIds = (studentBatches || []).map(sb => sb.batch_id);
    let batchSubjects: any[] = [];
    if (batchIds.length > 0) {
      const { data: bsData } = await supabase
        .from('batch_subject')
        .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
        .in('batch_id', batchIds);
      batchSubjects = bsData || [];
    }

    const map = new Map<string, any>();

    (batchSubjects || []).forEach((b: any) => {
      if (b.subject) {
        map.set(b.subject.id, {
          ...b.subject,
          maxMarks: b.subject.max_marks,
          passingMarks: b.subject.passing_marks,
          isActive: b.subject.is_active,
          isDirect: false,
        });
      }
    });

    (directSubjects || []).forEach((d: any) => {
      if (d.subject) {
        map.set(d.subject.id, {
          ...d.subject,
          maxMarks: d.subject.max_marks,
          passingMarks: d.subject.passing_marks,
          isActive: d.subject.is_active,
          isDirect: true,
        });
      }
    });

    return apiSuccess(Array.from(map.values()), 'Student subjects fetched');
  } catch (error) {
    console.error('Get student subjects error:', error);
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

    const { data: student } = await supabase.from('students').select('id').eq('id', params.id).eq('institute_id', user.instituteId).is('deleted_at', null).maybeSingle();
    if (!student) return apiError('Student not found', 404);

    const { data: existingLinks } = await supabase
      .from('student_subject')
      .select('subject_id')
      .eq('student_id', params.id)
      .in('subject_id', idsToAssign);

    const existingSet = new Set(existingLinks?.map(l => l.subject_id) || []);
    const newSubjectIds = idsToAssign.filter((sid: string) => !existingSet.has(sid));

    if (newSubjectIds.length === 0) return apiError('All selected subjects are already linked to this student', 409);

    const toInsert = newSubjectIds.map((sid: string) => ({
      student_id: params.id, subject_id: sid, institute_id: user.instituteId,
    }));

    const { error } = await supabase.from('student_subject').insert(toInsert);
    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_subjects_assigned', entityType: 'student', entityId: params.id, newValues: { subjectIds: newSubjectIds }, request });

    return apiSuccess({ assigned: newSubjectIds }, 'Subjects assigned to student successfully');
  } catch (error) {
    console.error('Assign student subjects error:', error);
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
      .from('student_subject')
      .delete()
      .eq('student_id', params.id)
      .eq('subject_id', subjectId)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_subject_unlinked', entityType: 'student', entityId: params.id, newValues: { subjectId }, request });

    return apiSuccess(null, 'Subject unlinked from student successfully');
  } catch (error) {
    console.error('Unlink student subject error:', error);
    return apiError('An error occurred', 500);
  }
}
