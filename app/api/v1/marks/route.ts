export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const studentId = searchParams.get('studentId') || '';
    const examId = searchParams.get('examId') || '';
    const subjectId = searchParams.get('subjectId') || '';
    const isPublished = searchParams.get('isPublished');

    let query = supabase
      .from('marks')
      .select('id, institute_id, student_id, exam_id, subject_id, max_marks, obtained_marks, grade, percentage, is_pass, remarks, entered_by, is_published, created_at, updated_at, student:students(id, first_name, last_name, student_id, admission_number), exam:exams(id, name, code), subject:subjects(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId);

    if (studentId) query = query.eq('student_id', studentId);
    if (examId) query = query.eq('exam_id', examId);
    if (subjectId) query = query.eq('subject_id', subjectId);
    if (isPublished === 'true') query = query.eq('is_published', true);
    if (isPublished === 'false') query = query.eq('is_published', false);
    if (search) {
      query = query.or(`student_id.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Marks fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List marks error:', error);
    return apiError('An error occurred', 500);
  }
}
