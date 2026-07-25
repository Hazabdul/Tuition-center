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
    const action = url.searchParams.get('action') || '';

    let query = supabase
      .from('activity_logs')
      .select('id, institute_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at', { count: 'exact' });

    if (user.role === 'super_admin') {
      if (action) query = query.ilike('action', `%${action}%`);
    } else {
      query = query.eq('institute_id', user.instituteId);
      if (action) query = query.ilike('action', `%${action}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch user names separately to avoid complex joins
    const userIds = [...new Set((data || []).map((l: Record<string, unknown>) => l.user_id).filter(Boolean))];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds as string[]);
      userMap = Object.fromEntries((users || []).map((u: Record<string, string>) => [u.id, `${u.first_name} ${u.last_name || ''}`.trim()]));
    }

    const enriched = (data || []).map((log: Record<string, unknown>) => ({
      ...log,
      userName: log.user_id ? (userMap[log.user_id as string] || 'Unknown') : 'System',
    }));

    return apiSuccess(enriched, 'Activity logs fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error(err);
    return apiError('Failed to fetch activity logs', 500);
  }
}
