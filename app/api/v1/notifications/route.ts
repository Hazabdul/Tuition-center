export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' });

    if (user.role === 'super_admin') {
      query = query.is('institute_id', null).or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.eq('institute_id', user.instituteId).or(`user_id.eq.${user.id},user_id.is.null`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return apiSuccess(data || [], 'Notifications fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error(err);
    return apiError('Failed to fetch notifications', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    // Mark all as read for current user
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    return apiSuccess(null, 'Notifications marked as read');
  } catch (err) {
    console.error(err);
    return apiError('Failed to update notifications', 500);
  }
}
