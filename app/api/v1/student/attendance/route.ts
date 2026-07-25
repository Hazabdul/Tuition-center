export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';

    // Find student ID linked to this user
    let studentId = user.studentId;
    if (!studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      studentId = student?.id;
    }

    if (!studentId) {
      return apiSuccess([], 'No student profile linked to this account', {
        page, limit, total: 0, totalPages: 1,
      });
    }

    let query = supabase
      .from('attendance')
      .select('id, student_id, batch_id, date, status, remarks, created_at, batches(id, name, code)', { count: 'exact' })
      .eq('student_id', studentId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('date', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    let { data, count, error } = await query;

    if (error) {
      console.error('Fetch student attendance database error:', error);
      let fallbackQuery = supabase
        .from('attendance')
        .select('id, student_id, batch_id, date, status, remarks, created_at', { count: 'exact' })
        .eq('student_id', studentId);
      if (status && status !== 'all') fallbackQuery = fallbackQuery.eq('status', status);
      fallbackQuery = fallbackQuery.order('date', { ascending: false });
      fallbackQuery = fallbackQuery.range((page - 1) * limit, page * limit - 1);

      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      count = fallbackRes.count;
    }

    const formattedData = (data || []).map((row: any) => ({
      ...row,
      batch: row.batches || row.batch || null,
    }));

    return apiSuccess(formattedData, 'Student attendance fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Student attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
