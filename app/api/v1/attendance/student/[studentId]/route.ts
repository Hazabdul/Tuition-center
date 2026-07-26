export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.studentId)) return apiError('Invalid student id', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100')));
    const skip = (page - 1) * limit;

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.studentId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
      studentId: studentObjId,
    };

    const [records, total] = await Promise.all([
      AttendanceDoc.find(filter)
        .populate('batchId', '_id name code')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceDoc.countDocuments(filter),
    ]);

    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const leaveCount = records.filter((r) => r.status === 'excused').length;
    const attendedCount = presentCount + lateCount;
    const attendancePercentage = total > 0 ? Math.round((attendedCount / total) * 100) : 0;

    const formattedRecords = records.map((r) => ({
      id: r._id.toString(),
      studentId: params.studentId,
      batchId: r.batchId,
      date: r.date,
      status: r.status,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt,
    }));

    return apiSuccess(
      {
        records: formattedRecords,
        summary: {
          total,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          attended: attendedCount,
          attendancePercentage,
        },
      },
      'Student attendance fetched',
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    );
  } catch (error) {
    console.error('Student attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
