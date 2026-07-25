export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { subjects } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return apiError('Subjects array is required', 400);
    }

    const { data: exam } = await supabase
      .from('exams')
      .select('id, institute_id, status')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!exam) return apiError('Exam not found', 404);

    if (exam.status === 'published') {
      return apiError('Cannot modify subjects of a published exam', 400);
    }

    for (const s of subjects) {
      if (!s.subjectId || s.maxMarks === undefined || s.passingMarks === undefined) {
        return apiError('Each subject must have subjectId, maxMarks, and passingMarks', 400);
      }
      if (s.passingMarks > s.maxMarks) {
        return apiError('Passing marks cannot exceed max marks', 400);
      }
    }

    const records = subjects.map((s: { subjectId: string; examDate?: string; startTime?: string; endTime?: string; maxMarks: number; passingMarks: number }) => ({
      exam_id: params.id,
      subject_id: s.subjectId,
      institute_id: user.instituteId,
      exam_date: s.examDate || null,
      start_time: s.startTime || null,
      end_time: s.endTime || null,
      max_marks: s.maxMarks,
      passing_marks: s.passingMarks,
    }));

    const { data: inserted, error } = await supabase
      .from('exam_subjects')
      .upsert(records, { onConflict: 'exam_id,subject_id' })
      .select('id, exam_id, subject_id, institute_id, exam_date, start_time, end_time, max_marks, passing_marks, created_at');

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_subjects_assigned',
      entityType: 'exam',
      entityId: params.id,
      newValues: { count: subjects.length },
      request,
    });

    return apiSuccess(inserted || [], `${subjects.length} subject(s) assigned to exam successfully`);
  } catch (error) {
    console.error('Assign exam subjects error:', error);
    return apiError('An error occurred', 500);
  }
}
