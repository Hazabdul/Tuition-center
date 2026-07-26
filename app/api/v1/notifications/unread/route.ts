export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import NotificationDoc from '@/models/Notification';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    const filter: Record<string, unknown> = {
      $or: [
        { userId: new mongoose.Types.ObjectId(user.id) },
        { userId: null },
      ],
    };

    if (user.instituteId) {
      filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
    }

    const notifications = await NotificationDoc.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const data = notifications.map((n) => ({
      id: n._id.toString(),
      instituteId: n.instituteId ? n.instituteId.toString() : null,
      userId: n.userId ? n.userId.toString() : null,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    const unreadCount = data.filter((n) => !n.isRead).length;

    return apiSuccess({ notifications: data, unreadCount }, 'Unread notifications fetched');
  } catch (error) {
    console.error('Fetch unread notifications error:', error);
    return apiError('Failed to fetch unread notifications', 500);
  }
}
