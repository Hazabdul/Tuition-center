export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import NotificationDoc from '@/models/Notification';
import ParentDoc from '@/models/Parent';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);

    const records = await AttendanceDoc.find({ instituteId: instituteObjId })
      .populate('studentId', '_id firstName lastName studentId')
      .lean();

    const studentMap = new Map<string, { student: any; total: number; present: number }>();

    records.forEach((r) => {
      const st = r.studentId as any;
      if (!st || !st._id) return;
      const sId = st._id.toString();

      if (!studentMap.has(sId)) {
        studentMap.set(sId, { student: st, total: 0, present: 0 });
      }
      const item = studentMap.get(sId)!;
      item.total++;
      if (r.status === 'present' || r.status === 'late') {
        item.present++;
      }
    });

    const deficitStudents: Record<string, unknown>[] = [];
    studentMap.forEach((val) => {
      const percentage = val.total > 0 ? Math.round((val.present / val.total) * 100) : 100;
      if (percentage < 75) {
        deficitStudents.push({
          studentId: val.student._id?.toString(),
          studentCode: val.student.studentId,
          studentName: `${val.student.firstName || ''} ${val.student.lastName || ''}`.trim(),
          totalClasses: val.total,
          attendedClasses: val.present,
          percentage,
        });
      }
    });

    return apiSuccess(deficitStudents, 'Low attendance deficit students fetched');
  } catch (error) {
    console.error('Attendance deficits error:', error);
    return apiError('Failed to fetch attendance deficits', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { studentId, studentName, percentage } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    const parents = await ParentDoc.find({
      children: studentObjId,
      instituteId: instituteObjId,
    })
      .populate('userId', '_id')
      .lean();

    let sentCount = 0;
    for (const p of parents) {
      const u = p.userId as any;
      const parentUserId = u?._id;
      if (parentUserId) {
        await NotificationDoc.create({
          instituteId: instituteObjId,
          userId: parentUserId,
          title: '⚠️ Low Attendance Warning Notice',
          message: `Attendance alert for ${studentName}: Current attendance is ${percentage}% (Below 75% required threshold). Please contact the institute admin.`,
          type: 'urgent',
          isRead: false,
        });
        sentCount++;
      }
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'attendance.send_warning',
      entityType: 'attendance',
      entityId: studentId,
      newValues: { studentName, percentage },
      request,
    });

    return apiSuccess({ sentCount }, `Attendance warning notice sent to parent!`);
  } catch (error) {
    console.error('Send attendance warning error:', error);
    return apiError('Failed to send attendance warning', 500);
  }
}
