export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const examId = searchParams.get('examId') || '';
    const subjectId = searchParams.get('subjectId') || '';

    let query = supabase
      .from('marks')
      .select('id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, is_published, created_at, updated_at, exam:exams(id, name, code, academic_year, status), subject:subjects(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .eq('student_id', params.studentId)
      .eq('is_published', true);

    if (examId) query = query.eq('exam_id', examId);
    if (subjectId) query = query.eq('subject_id', subjectId);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Student marks fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Student marks error:', error);
    return apiError('An error occurred', 500);
  }
}
