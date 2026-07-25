export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    // Fetch notifications tagged with classroom/batch announcements
    const { data: list } = await supabase
      .from('notifications')
      .select('*')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false })
      .limit(20);

    return apiSuccess(list || [], 'Classroom announcements fetched');
  } catch (error) {
    console.error('Fetch teacher announcements error:', error);
    return apiError('Failed to fetch announcements', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'teacher') {
      return apiError('Unauthorized: Only teachers can post classroom announcements', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { batchId, title, message, type } = body;

    if (!title || !message) {
      return apiError('Title and message are required', 400);
    }

    // 1. Fetch all students in target batch
    let targetUserIds: string[] = [];

    if (batchId) {
      const { data: enrolledStudents } = await supabase
        .from('student_batch')
        .select('student:students(user_id)')
        .eq('batch_id', batchId)
        .eq('institute_id', instituteId);

      targetUserIds = (enrolledStudents || [])
        .map((s: any) => s.student?.user_id)
        .filter(Boolean);
    }

    let broadcastCount = 0;

    if (targetUserIds.length > 0) {
      for (const uId of targetUserIds) {
        await supabase.from('notifications').insert({
          institute_id: instituteId,
          user_id: uId,
          title: `📌 ${title}`,
          message: message,
          type: type || 'info',
          is_read: false,
        });
        broadcastCount++;
      }
    } else {
      // General announcement to institute
      await supabase.from('notifications').insert({
        institute_id: instituteId,
        user_id: null,
        title: `📌 ${title}`,
        message: message,
        type: type || 'info',
        is_read: false,
      });
      broadcastCount = 1;
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'teacher.post_announcement',
      entityType: 'notification',
      newValues: { batchId, title, broadcastCount },
      request,
    });

    return apiSuccess({ broadcastCount }, `Classroom announcement broadcasted to ${broadcastCount} students!`);
  } catch (error) {
    console.error('Post teacher announcement error:', error);
    return apiError('Failed to post classroom announcement', 500);
  }
}
