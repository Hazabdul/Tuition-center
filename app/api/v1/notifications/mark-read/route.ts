export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import NotificationDoc from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    await NotificationDoc.updateMany(
      {
        $or: [
          { userId: new mongoose.Types.ObjectId(user.id) },
          { userId: null },
        ],
        ...(user.instituteId
          ? { instituteId: new mongoose.Types.ObjectId(user.instituteId) }
          : {}),
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    return apiSuccess({ success: true }, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark read notifications error:', error);
    return apiError('Failed to mark notifications as read', 500);
  }
}
