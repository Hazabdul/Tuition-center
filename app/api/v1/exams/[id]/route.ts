export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    let exam: any = null;
    let error: any = null;

    const res = await supabase
      .from('exams')
      .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at, batches(id, name, code, academic_year)')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    exam = res.data;
    error = res.error;

    if (error || !exam) {
      const fallbackRes = await supabase
        .from('exams')
        .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at')
        .eq('id', params.id)
        .eq('institute_id', user.instituteId)
        .maybeSingle();
      exam = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !exam) return apiError('Exam not found', 404);

    const { data: examSubjects } = await supabase
      .from('exam_subjects')
      .select('id, exam_id, subject_id, institute_id, exam_date, start_time, end_time, max_marks, passing_marks, created_at, subject:subjects(id, name, code)')
      .eq('exam_id', params.id)
      .eq('institute_id', user.instituteId);

    const formattedExam = {
      ...exam,
      batch: (exam as any).batches || (exam as any).batch || null,
      exam_subjects: examSubjects || [],
    };

    return apiSuccess(formattedExam, 'Exam fetched successfully');
  } catch (error) {
    console.error('Get exam error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const batchId = body.batchId ?? body.batch_id;
    const name = body.name;
    const code = body.code ? body.code.toUpperCase().trim() : undefined;
    const academicYear = body.academicYear ?? body.academic_year;
    const startDate = body.startDate ?? body.start_date;
    const endDate = body.endDate ?? body.end_date;
    const description = body.description;

    const { data: existing } = await supabase
      .from('exams')
      .select('id, batch_id, name, code, academic_year, start_date, end_date, description, status')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Exam not found', 404);

    if (code && code !== existing.code) {
      const { data: existingCode } = await supabase
        .from('exams')
        .select('id')
        .eq('institute_id', user.instituteId)
        .ilike('code', code)
        .neq('id', params.id)
        .maybeSingle();

      if (existingCode) return apiError('Exam with this code already exists in the institute', 409);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (batchId !== undefined) updateData.batch_id = batchId;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (academicYear !== undefined) updateData.academic_year = academicYear;
    if (startDate !== undefined) updateData.start_date = startDate || null;
    if (endDate !== undefined) updateData.end_date = endDate || null;
    if (description !== undefined) updateData.description = description;

    const { data: exam, error } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', params.id)
      .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError('Exam with this code already exists in the institute', 409);
      }
      return apiError(error.message, 400);
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_updated',
      entityType: 'exam',
      entityId: params.id,
      oldValues: existing,
      newValues: body,
      request,
    });

    return apiSuccess(exam, 'Exam updated successfully');
  } catch (error) {
    console.error('Update exam error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: existing } = await supabase
      .from('exams')
      .select('id, status')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Exam not found', 404);

    let { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', params.id);

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_deleted',
      entityType: 'exam',
      entityId: params.id,
      oldValues: existing,
      request,
    });

    return apiSuccess(null, 'Exam deleted successfully');
  } catch (error) {
    console.error('Delete exam error:', error);
    return apiError('An error occurred', 500);
  }
}
