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
    const isActive = searchParams.get('isActive');

    let query = supabase
      .from('fee_categories')
      .select('id, institute_id, name, code, description, is_active, created_at, updated_at', { count: 'exact' })
      .eq('institute_id', user.instituteId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    if (isActive === 'true') query = query.eq('is_active', true);
    if (isActive === 'false') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Fee categories fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List fee categories error:', error);
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
    const { name, code, description, isActive } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const { data: existing } = await supabase
      .from('fee_categories')
      .select('id')
      .eq('institute_id', user.instituteId)
      .eq('code', code)
      .maybeSingle();

    if (existing) return apiError('Fee category with this code already exists in the institute', 409);

    const { data: category, error } = await supabase
      .from('fee_categories')
      .insert({
        institute_id: user.instituteId,
        name,
        code,
        description: description || null,
        is_active: isActive !== undefined ? isActive : true,
      })
      .select('id, institute_id, name, code, description, is_active, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError('Fee category with this code already exists in the institute', 409);
      }
      return apiError(error.message, 400);
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_category_created',
      entityType: 'fee_category',
      entityId: category.id,
      newValues: body,
      request,
    });

    return apiSuccess(category, 'Fee category created successfully');
  } catch (error) {
    console.error('Create fee category error:', error);
    return apiError('An error occurred', 500);
  }
}
