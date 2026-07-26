export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.batchId)) return apiError('Invalid batch id', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const batchObjId = new mongoose.Types.ObjectId(params.batchId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
      batchId: batchObjId,
    };

    const [records, total] = await Promise.all([
      AttendanceDoc.find(filter)
        .populate('studentId', '_id firstName lastName studentId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AttendanceDoc.countDocuments(filter),
    ]);

    const data = records.map((r) => ({
      id: r._id.toString(),
      studentId: r.studentId,
      batchId: params.batchId,
      date: r.date,
      status: r.status,
      remarks: r.remarks ?? null,
      createdAt: r.createdAt,
    }));

    return apiSuccess(data, 'Batch attendance fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Batch attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
