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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (user.role === 'super_admin') {
      filter.$or = [{ instituteId: null }, { userId: new mongoose.Types.ObjectId(user.id) }];
    } else if (user.instituteId) {
      filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
      filter.$or = [
        { userId: new mongoose.Types.ObjectId(user.id) },
        { userId: null },
      ];
    } else {
      filter.userId = new mongoose.Types.ObjectId(user.id);
    }

    const [records, total] = await Promise.all([
      NotificationDoc.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationDoc.countDocuments(filter),
    ]);

    const data = records.map((n) => ({
      id: n._id.toString(),
      instituteId: n.instituteId ? n.instituteId.toString() : null,
      userId: n.userId ? n.userId.toString() : null,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return apiSuccess(data, 'Notifications fetched', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List notifications error:', err);
    return apiError('Failed to fetch notifications', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    await NotificationDoc.updateMany(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { $set: { isRead: true } }
    );

    return apiSuccess(null, 'Notifications marked as read');
  } catch (err) {
    console.error('Mark notifications read error:', err);
    return apiError('Failed to update notifications', 500);
  }
}
