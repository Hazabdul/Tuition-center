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
    const sortBy = searchParams.get('sortBy') || 'due_date';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const batchId = searchParams.get('batchId') || '';
    const today = new Date().toISOString().split('T')[0];

    let studentQuery = supabase
      .from('students')
      .select('id, first_name, last_name, student_id, admission_number')
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (batchId) {
      const { data: batchStudents } = await supabase
        .from('student_batch')
        .select('student_id')
        .eq('batch_id', batchId);
      const studentIds = (batchStudents || []).map(bs => bs.student_id);
      if (studentIds.length === 0) {
        return apiSuccess([], 'No overdue fees found', { page, limit, total: 0, totalPages: 0 });
      }
      studentQuery = studentQuery.in('id', studentIds);
    }

    if (search) {
      studentQuery = studentQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id.ilike.%${search}%`);
    }

    const { data: students } = await studentQuery;
    const studentIds = (students || []).map(s => s.id);

    if (studentIds.length === 0) {
      return apiSuccess([], 'No overdue fees found', { page, limit, total: 0, totalPages: 0 });
    }

    let feeQuery = supabase
      .from('student_fees')
      .select('id, institute_id, student_id, category_id, structure_id, total_amount, discount_amount, waived_amount, paid_amount, balance_amount, due_date, status, notes, created_at, category:fee_categories(id, name, code), student:students(id, first_name, last_name, student_id, admission_number)', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .in('student_id', studentIds)
      .neq('status', 'paid')
      .lt('due_date', today);

    feeQuery = feeQuery.order(sortBy, { ascending: sortOrder === 'asc' });
    feeQuery = feeQuery.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await feeQuery;

    return apiSuccess(data || [], 'Overdue fees fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Overdue fees error:', error);
    return apiError('An error occurred', 500);
  }
}
