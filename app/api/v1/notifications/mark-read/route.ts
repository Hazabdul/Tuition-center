export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    // Mark all notifications for this user or in general as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},user_id.is.null`);

    return apiSuccess({ success: true }, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark read notifications error:', error);
    return apiError('Failed to mark notifications as read', 500);
  }
}
