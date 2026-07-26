export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || '';

    let studentObjId: mongoose.Types.ObjectId | null = null;
    if (user.studentId && mongoose.Types.ObjectId.isValid(user.studentId)) {
      studentObjId = new mongoose.Types.ObjectId(user.studentId);
    } else {
      const student = await StudentDoc.findOne({ userId: user.id }).select('_id').lean();
      if (student) studentObjId = student._id as mongoose.Types.ObjectId;
    }

    if (!studentObjId) {
      return apiSuccess([], 'No student profile linked to this account', {
        page, limit, total: 0, totalPages: 1,
      });
    }

    const filter: Record<string, unknown> = {
      studentId: studentObjId,
    };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [records, total] = await Promise.all([
      AttendanceDoc.find(filter)
        .populate('batchId', '_id name code')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceDoc.countDocuments(filter),
    ]);

    const formattedData = records.map((r) => ({
      id: r._id.toString(),
      studentId: r.studentId.toString(),
      batchId: r.batchId,
      batch: r.batchId,
      date: r.date,
      status: r.status,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt,
    }));

    return apiSuccess(formattedData, 'Student attendance fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Student attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
