export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    // Fetch unread notifications for this user or general institute broadcasts
    let query = supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (user.instituteId) {
      query = query.eq('institute_id', user.instituteId);
    }

    const { data: notifications } = await query;

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return apiSuccess(
      {
        notifications: notifications || [],
        unreadCount,
      },
      'Unread notifications fetched'
    );
  } catch (error) {
    console.error('Fetch unread notifications error:', error);
    return apiError('Failed to fetch unread notifications', 500);
  }
}
