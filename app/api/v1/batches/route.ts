export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('batches')
      .select('id, name, code, academic_year, start_date, end_date, start_time, end_time, capacity, description, is_active, created_at', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,academic_year.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Batches fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List batches error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { name, code, academicYear, startDate, endDate, startTime, endTime, capacity, description } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const { data: existingCode } = await supabase.from('batches').select('id').eq('institute_id', user.instituteId).eq('code', code).is('deleted_at', null).maybeSingle();
    if (existingCode) return apiError('Batch code already exists in this institute', 409);

    if (capacity !== undefined && capacity !== null && capacity < 1) return apiError('Capacity must be a positive number', 400);

    const { data: batch, error } = await supabase
      .from('batches')
      .insert({
        institute_id: user.instituteId,
        name, code, academic_year: academicYear,
        start_date: startDate, end_date: endDate, start_time: startTime, end_time: endTime,
        capacity: capacity || 0, description, is_active: true,
      })
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'batch_created', entityType: 'batch', entityId: batch.id, newValues: body, request });

    return apiSuccess(batch, 'Batch created successfully');
  } catch (error) {
    console.error('Create batch error:', error);
    return apiError('An error occurred', 500);
  }
}
