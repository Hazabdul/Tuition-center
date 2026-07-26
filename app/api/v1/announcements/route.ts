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

    const userObjId = new mongoose.Types.ObjectId(user.id);

    const notifications = await NotificationDoc.find({
      $or: [{ userId: userObjId }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const data = notifications.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return apiSuccess(data, 'Announcements fetched');
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
    const { title, message, type } = body;

    if (!title || !message) {
      return apiError('Title and message are required', 400);
    }

    await dbConnect();

    const notification = await NotificationDoc.create({
      instituteId: user.instituteId ? new mongoose.Types.ObjectId(user.instituteId) : null,
      userId: null,
      title: `📢 ${title}`,
      message,
      type: type || 'info',
      isRead: false,
    });

    return apiSuccess(
      {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
      },
      'Global announcement posted successfully'
    );
  } catch (error) {
    console.error('Post announcement error:', error);
    return apiError('Failed to post announcement', 500);
  }
}
