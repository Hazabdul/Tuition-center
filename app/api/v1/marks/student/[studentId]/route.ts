export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import MarkDoc from '@/models/Mark';
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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.studentId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
      studentId: studentObjId,
    };

    const [records, total] = await Promise.all([
      MarkDoc.find(filter)
        .populate('examId', '_id name code academicYear status')
        .populate('subjectId', '_id name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarkDoc.countDocuments(filter),
    ]);

    const data = records.map((m) => ({
      id: m._id.toString(),
      studentId: params.studentId,
      examId: m.examId,
      subjectId: m.subjectId,
      maxMarks: m.maxMarks,
      obtainedMarks: m.obtainedMarks,
      grade: m.grade ?? null,
      percentage: m.percentage,
      isPass: m.isPass,
      remarks: m.remarks ?? null,
      createdAt: m.createdAt,
    }));

    return apiSuccess(data, 'Student marks fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Student marks error:', error);
    return apiError('An error occurred', 500);
  }
}
