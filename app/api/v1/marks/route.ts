export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import MarkDoc from '@/models/Mark';
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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const studentId = searchParams.get('studentId') || '';
    const examId = searchParams.get('examId') || '';
    const subjectId = searchParams.get('subjectId') || '';
    const isPublished = searchParams.get('isPublished');

    const filter: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    };

    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      filter.studentId = new mongoose.Types.ObjectId(studentId);
    }
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      filter.examId = new mongoose.Types.ObjectId(examId);
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    }
    if (isPublished === 'true') filter.isPass = true;
    if (isPublished === 'false') filter.isPass = false;

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      MarkDoc.find(filter)
        .populate('studentId', '_id firstName lastName studentId admissionNumber')
        .populate('examId', '_id name code')
        .populate('subjectId', '_id name code')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      MarkDoc.countDocuments(filter),
    ]);

    const data = records.map((m) => ({
      id: m._id.toString(),
      instituteId: m.instituteId.toString(),
      studentId: m.studentId,
      examId: m.examId,
      subjectId: m.subjectId,
      maxMarks: m.maxMarks,
      obtainedMarks: m.obtainedMarks,
      grade: m.grade ?? null,
      percentage: m.percentage,
      isPass: m.isPass,
      remarks: m.remarks ?? null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return apiSuccess(data, 'Marks fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List marks error:', error);
    return apiError('An error occurred', 500);
  }
}
