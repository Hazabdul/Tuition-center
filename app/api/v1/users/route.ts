export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['super_admin', 'institute_admin'].includes(user.role)) {
      return apiError('Unauthorized', 403);
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const roleFilter = url.searchParams.get('role') || '';
    const isActive = url.searchParams.get('isActive');

    let query = supabase
      .from('users')
      .select('id, institute_id, role, username, email, phone, first_name, last_name, is_active, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .neq('role', 'super_admin');

    if (user.role !== 'super_admin') {
      query = query.eq('institute_id', user.instituteId);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    }
    if (roleFilter) query = query.eq('role', roleFilter);
    if (isActive !== null && isActive !== '') query = query.eq('is_active', isActive === 'true');

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return apiSuccess(data || [], 'Users fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error(err);
    return apiError('Failed to fetch users', 500);
  }
}
