export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const batchId = searchParams.get('batchId') || searchParams.get('batch_id') || '';
    const date = searchParams.get('date') || '';
    const studentId = searchParams.get('studentId') || searchParams.get('student_id') || '';
    const status = searchParams.get('status') || '';

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
    };

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) filter.batchId = new mongoose.Types.ObjectId(batchId);
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) filter.studentId = new mongoose.Types.ObjectId(studentId);
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      filter.date = { $gte: start, $lte: end };
    }

    const [records, total] = await Promise.all([
      AttendanceDoc.find(filter)
        .populate('studentId', '_id firstName lastName studentId')
        .populate('batchId', '_id name code')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceDoc.countDocuments(filter),
    ]);

    const formattedData = records.map((r) => ({
      id: r._id.toString(),
      studentId: r.studentId,
      student: r.studentId,
      batchId: r.batchId,
      batch: r.batchId,
      date: r.date,
      status: r.status,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt,
    }));

    return apiSuccess(formattedData, 'Attendance fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List attendance error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentId, batchId, date, status, remarks } = body;

    if (!studentId || !batchId || !date || !status) {
      return apiError('Student ID, batch ID, date, and status are required', 400);
    }

    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: present, absent, late, excused', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const batchObjId = new mongoose.Types.ObjectId(batchId);
    const attendanceDate = new Date(date);

    const existing = await AttendanceDoc.findOne({
      instituteId: instituteObjId,
      studentId: studentObjId,
      date: attendanceDate,
    }).lean();

    if (existing) {
      return apiError('Attendance already marked for this student on this date', 409);
    }

    const attendance = await AttendanceDoc.create({
      instituteId: instituteObjId,
      studentId: studentObjId,
      batchId: batchObjId,
      date: attendanceDate,
      status,
      remarks: remarks || null,
      recordedBy: new mongoose.Types.ObjectId(user.id),
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_marked',
      entityType: 'attendance',
      entityId: attendance._id.toString(),
      newValues: { studentId, batchId, date, status, remarks },
      request,
    });

    return apiSuccess(
      { id: attendance._id.toString(), studentId, batchId, date, status },
      'Attendance marked successfully'
    );
  } catch (error) {
    console.error('Create attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
