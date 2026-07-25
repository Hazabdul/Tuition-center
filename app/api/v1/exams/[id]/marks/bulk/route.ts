export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { subjectId, maxMarks, marks } = body;

    if (!subjectId || maxMarks === undefined || !Array.isArray(marks) || marks.length === 0) {
      return apiError('Subject ID, max marks, and marks array are required', 400);
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
      return apiError('Cannot enter marks for a published exam', 400);
    }

    const { data: examSubject } = await supabase
      .from('exam_subjects')
      .select('id, max_marks, passing_marks')
      .eq('exam_id', params.id)
      .eq('subject_id', subjectId)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!examSubject) return apiError('Subject is not assigned to this exam', 404);

    const passingMarks = examSubject.passing_marks;

    const { data: existingMarks } = await supabase
      .from('marks')
      .select('id, student_id, obtained_marks')
      .eq('institute_id', user.instituteId)
      .eq('exam_id', params.id)
      .eq('subject_id', subjectId);

    const existingMap = new Map((existingMarks || []).map(m => [m.student_id, m]));

    const inserts: Record<string, unknown>[] = [];
    const updates: { id: string; data: Record<string, unknown> }[] = [];

    for (const entry of marks) {
      const { studentId, obtainedMarks, remarks } = entry;

      if (!studentId || obtainedMarks === undefined || obtainedMarks === null) {
        continue;
      }

      if (obtainedMarks < 0 || obtainedMarks > maxMarks) {
        continue;
      }

      const percentage = maxMarks > 0 ? Math.round((obtainedMarks / maxMarks) * 10000) / 100 : 0;
      const grade = calculateGrade(percentage);
      const isPass = obtainedMarks >= passingMarks;

      const existing = existingMap.get(studentId);
      if (existing) {
        updates.push({
          id: existing.id,
          data: {
            max_marks: maxMarks,
            obtained_marks: obtainedMarks,
            grade,
            percentage,
            is_pass: isPass,
            remarks: remarks || null,
            entered_by: user.id,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        inserts.push({
          institute_id: user.instituteId,
          student_id: studentId,
          exam_id: params.id,
          subject_id: subjectId,
          max_marks: maxMarks,
          obtained_marks: obtainedMarks,
          grade,
          percentage,
          is_pass: isPass,
          remarks: remarks || null,
          entered_by: user.id,
          is_published: false,
        });
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;

    if (inserts.length > 0) {
      const { data: inserted } = await supabase
        .from('marks')
        .insert(inserts)
        .select('id');
      insertedCount = inserted?.length || 0;
    }

    for (const upd of updates) {
      const { error } = await supabase
        .from('marks')
        .update(upd.data)
        .eq('id', upd.id);
      if (!error) updatedCount++;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'marks_bulk_entered',
      entityType: 'mark',
      newValues: { examId: params.id, subjectId, inserted: insertedCount, updated: updatedCount },
      request,
    });

    return apiSuccess(
      { inserted: insertedCount, updated: updatedCount, total: marks.length },
      `Bulk marks entered: ${insertedCount} inserted, ${updatedCount} updated`
    );
  } catch (error) {
    console.error('Bulk marks error:', error);
    return apiError('An error occurred', 500);
  }
}
