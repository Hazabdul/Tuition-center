export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AnnouncementDoc from '@/models/Announcement';
import NotificationDoc from '@/models/Notification';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const announcements = await AnnouncementDoc.find({
      instituteId: new mongoose.Types.ObjectId(instituteId),
    })
      .populate('postedBy', '_id firstName lastName role')
      .populate('batchId', '_id name code')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const data = announcements.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      message: a.message,
      type: a.type,
      batchId: a.batchId ? (a.batchId as any)._id?.toString() : null,
      batch: a.batchId,
      postedBy: a.postedBy,
      createdAt: a.createdAt,
    }));

    return apiSuccess(data, 'Classroom announcements fetched');
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

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);

    const announcement = await AnnouncementDoc.create({
      instituteId: instituteObjId,
      postedBy: new mongoose.Types.ObjectId(user.id),
      batchId: batchId && mongoose.Types.ObjectId.isValid(batchId)
        ? new mongoose.Types.ObjectId(batchId)
        : null,
      title: title.trim(),
      message: message.trim(),
      type: type || 'info',
    });

    let targetStudentUserIds: mongoose.Types.ObjectId[] = [];
    let broadcastCount = 0;

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const students = await StudentDoc.find({
        batchId: new mongoose.Types.ObjectId(batchId),
        instituteId: instituteObjId,
        deletedAt: null,
      })
        .select('userId')
        .lean();

      targetStudentUserIds = students
        .map((s) => s.userId as mongoose.Types.ObjectId | undefined)
        .filter((id): id is mongoose.Types.ObjectId => !!id);
    }

    if (targetStudentUserIds.length > 0) {
      const notificationsToInsert = targetStudentUserIds.map((uId) => ({
        instituteId: instituteObjId,
        userId: uId,
        title: `📌 ${title}`,
        message,
        type: type || 'info',
        isRead: false,
      }));
      await NotificationDoc.insertMany(notificationsToInsert, { ordered: false });
      broadcastCount = notificationsToInsert.length;
    } else {
      await NotificationDoc.create({
        instituteId: instituteObjId,
        userId: null,
        title: `📌 ${title}`,
        message,
        type: type || 'info',
        isRead: false,
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

    return apiSuccess(
      { broadcastCount, announcementId: announcement._id.toString() },
      `Classroom announcement broadcasted to ${broadcastCount} students!`
    );
  } catch (error) {
    console.error('Post teacher announcement error:', error);
    return apiError('Failed to post classroom announcement', 500);
  }
}
