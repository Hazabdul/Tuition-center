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
    const batchId = searchParams.get('batchId') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const isActive = searchParams.get('isActive');

    let query = supabase
      .from('fee_structures')
      .select('id, institute_id, category_id, batch_id, academic_year, amount, due_date, is_active, created_at, updated_at, category:fee_categories(id, name, code), batch:batches(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId);

    if (batchId) query = query.eq('batch_id', batchId);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (isActive === 'true') query = query.eq('is_active', true);
    if (isActive === 'false') query = query.eq('is_active', false);
    if (search) {
      query = query.or(`academic_year.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Fee structures fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List fee structures error:', error);
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
    const { categoryId, batchId, academicYear, amount, dueDate, isActive } = body;

    if (!categoryId || amount === undefined || amount === null) {
      return apiError('Category ID and amount are required', 400);
    }

    if (amount < 0) return apiError('Amount must be non-negative', 400);

    const { data: category } = await supabase
      .from('fee_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!category) return apiError('Fee category not found', 404);

    if (batchId) {
      const { data: batch } = await supabase
        .from('batches')
        .select('id')
        .eq('id', batchId)
        .eq('institute_id', user.instituteId)
        .maybeSingle();

      if (!batch) return apiError('Batch not found', 404);
    }

    const { data: structure, error } = await supabase
      .from('fee_structures')
      .insert({
        institute_id: user.instituteId,
        category_id: categoryId,
        batch_id: batchId || null,
        academic_year: academicYear || null,
        amount,
        due_date: dueDate || null,
        is_active: isActive !== undefined ? isActive : true,
      })
      .select('id, institute_id, category_id, batch_id, academic_year, amount, due_date, is_active, created_at, updated_at')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_structure_created',
      entityType: 'fee_structure',
      entityId: structure.id,
      newValues: body,
      request,
    });

    return apiSuccess(structure, 'Fee structure created successfully');
  } catch (error) {
    console.error('Create fee structure error:', error);
    return apiError('An error occurred', 500);
  }
}
