export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const { searchParams } = new URL(request.url);
    const targetRole = searchParams.get('role') || user.role;

    // Fetch notifications/announcements targeting this role or all
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(10);

    return apiSuccess(notifications || [], 'Announcements fetched');
  } catch (error) {
    console.error('Fetch announcements error:', error);
    return apiError('Failed to fetch announcements', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'super_admin') {
      return apiError('Unauthorized: Only Super Admins can post global announcements', 403);
    }

    const body = await request.json();
    const { title, message, targetRole, type } = body;

    if (!title || !message) {
      return apiError('Title and message are required', 400);
    }

    // Insert broadcast notification into notifications table
    const { data: announcement, error } = await supabase
      .from('notifications')
      .insert({
        title: `📢 ${title}`,
        message: message,
        type: type || 'info',
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return apiError(error.message, 400);
    }

    return apiSuccess(announcement, 'Global announcement posted successfully');
  } catch (error) {
    console.error('Post announcement error:', error);
    return apiError('Failed to post announcement', 500);
  }
}
