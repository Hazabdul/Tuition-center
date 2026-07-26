export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const batchId = body.batchId || body.batch_id;
    const date = body.date;
    const rawRecords = body.records || body.students || [];

    if (!batchId || !date || !Array.isArray(rawRecords) || rawRecords.length === 0) {
      return apiError('Batch ID, date, and records array are required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const batchObjId = new mongoose.Types.ObjectId(batchId);
    const attendanceDate = new Date(date);

    let processedCount = 0;

    for (const rec of rawRecords) {
      const studentId = rec.studentId || rec.student_id || rec.id;
      const status = rec.status || 'present';
      const remarks = rec.remarks || null;

      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) continue;

      const studentObjId = new mongoose.Types.ObjectId(studentId);

      await AttendanceDoc.findOneAndUpdate(
        {
          instituteId: instituteObjId,
          studentId: studentObjId,
          batchId: batchObjId,
          date: attendanceDate,
        },
        {
          $set: {
            status: ['present', 'absent', 'late', 'excused'].includes(status) ? status : 'present',
            remarks,
            recordedBy: new mongoose.Types.ObjectId(user.id),
          },
        },
        { upsert: true, new: true }
      );

      processedCount++;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_bulk_marked',
      entityType: 'attendance',
      newValues: { batchId, date, count: processedCount },
      request,
    });

    return apiSuccess(
      { processed: processedCount, total: rawRecords.length },
      `Bulk attendance processed: ${processedCount} records`
    );
  } catch (error) {
    console.error('Bulk attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
