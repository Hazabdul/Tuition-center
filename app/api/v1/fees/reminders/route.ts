export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import NotificationDoc from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);

    const parents = await ParentDoc.find({
      instituteId: instituteObjId,
      deletedAt: null,
    })
      .populate('userId', '_id')
      .populate('children', '_id firstName lastName studentId')
      .lean();

    let remindersCount = 0;
    const notificationsToInsert: Record<string, unknown>[] = [];

    for (const p of parents) {
      const u = p.userId as any;
      const parentUserId = u?._id;
      if (!parentUserId) continue;

      const children = (p.children || []) as any[];
      for (const child of children) {
        const studentName = `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Student';
        notificationsToInsert.push({
          instituteId: instituteObjId,
          userId: parentUserId,
          title: '💳 Fee Payment Due Reminder',
          message: `Fee payment reminder for ${studentName}. Please pay any pending fees promptly.`,
          type: 'warning',
          isRead: false,
        });
        remindersCount++;
      }
    }

    if (notificationsToInsert.length > 0) {
      await NotificationDoc.insertMany(notificationsToInsert, { ordered: false });
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'fees.send_reminders',
      entityType: 'fee',
      newValues: { remindersCount },
      request,
    });

    return apiSuccess({ remindersCount }, `Fee payment reminders sent to ${remindersCount} parents!`);
  } catch (error) {
    console.error('Fee reminders error:', error);
    return apiError('Failed to send fee reminders', 500);
  }
}
