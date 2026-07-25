export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const date = searchParams.get('date') || '';

    let query = supabase
      .from('attendance')
      .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, updated_at, student:students(id, first_name, last_name, student_id)', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .eq('batch_id', params.batchId);

    if (date) {
      query = query.eq('date', date);
    } else {
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Batch attendance fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Batch attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
