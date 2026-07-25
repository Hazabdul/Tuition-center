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
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const batchId = searchParams.get('batchId') || searchParams.get('batch_id') || '';
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('exams')
      .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at, batches(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (batchId) query = query.eq('batch_id', batchId);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    let { data, count, error } = await query;

    if (error) {
      console.error('Fetch exams database error:', error);
      // Fallback query without relationship join if schema cache relationship fails
      let fallbackQuery = supabase
        .from('exams')
        .select('id, institute_id, batch_id, name, code, academic_year, start_date, end_date, description, status, created_at, updated_at', { count: 'exact' })
        .eq('institute_id', user.instituteId)
        .is('deleted_at', null);
      if (batchId) fallbackQuery = fallbackQuery.eq('batch_id', batchId);
      if (status) fallbackQuery = fallbackQuery.eq('status', status);
      if (search) fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      fallbackQuery = fallbackQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      fallbackQuery = fallbackQuery.range((page - 1) * limit, page * limit - 1);

      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      count = fallbackRes.count;
    }

    // Format output so batch object is always available cleanly
    const formattedData = (data || []).map((exam: any) => ({
      ...exam,
      batch: exam.batches || exam.batch || null,
    }));

    return apiSuccess(formattedData, 'Exams fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List exams error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const batchId = body.batchId || body.batch_id;
    const name = body.name;
    let code = (body.code || name?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || '').toUpperCase().trim();
    if (!code) code = `EXAM${Math.floor(100 + Math.random() * 900)}`;

    const academicYear = body.academicYear || body.academic_year;
    const startDate = body.startDate || body.start_date;
    const endDate = body.endDate || body.end_date;
    const description = body.description;

    if (!batchId || !name) {
      return apiError('Batch ID and exam name are required', 400);
    }

    const { data: batch } = await supabase
      .from('batches')
      .select('id')
      .eq('id', batchId)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!batch) return apiError('Batch not found', 404);

    const { data: existing } = await supabase
      .from('exams')
      .select('id')
      .eq('institute_id', user.instituteId)
      .eq('code', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) return apiError('Exam with this code already exists in the institute', 409);

    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        institute_id: user.instituteId,
        batch_id: batchId,
        name,
        code,
        academic_year: academicYear || null,
        start_date: startDate || null,
        end_date: endDate || null,
        description: description || null,
        status: 'draft',
      })
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
      action: 'exam_created',
      entityType: 'exam',
      entityId: exam.id,
      newValues: body,
      request,
    });

    return apiSuccess(exam, 'Exam created successfully');
  } catch (error) {
    console.error('Create exam error:', error);
    return apiError('An error occurred', 500);
  }
}
