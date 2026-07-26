export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import MarkDoc from '@/models/Mark';
import mongoose from 'mongoose';

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid mark id', 400);

    await dbConnect();

    const mark = await MarkDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    })
      .populate('studentId', '_id firstName lastName studentId admissionNumber')
      .populate('examId', '_id name code')
      .populate('subjectId', '_id name code')
      .lean();

    if (!mark) return apiError('Mark not found', 404);

    return apiSuccess({
      id: mark._id.toString(),
      studentId: mark.studentId,
      examId: mark.examId,
      subjectId: mark.subjectId,
      maxMarks: mark.maxMarks,
      obtainedMarks: mark.obtainedMarks,
      grade: mark.grade ?? null,
      percentage: mark.percentage,
      isPass: mark.isPass,
      remarks: mark.remarks ?? null,
      createdAt: mark.createdAt,
      updatedAt: mark.updatedAt,
    }, 'Mark fetched successfully');
  } catch (error) {
    console.error('Get mark error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid mark id', 400);

    const body = await request.json();
    const { maxMarks, obtainedMarks, remarks } = body;

    await dbConnect();

    const existing = await MarkDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    }).lean();

    if (!existing) return apiError('Mark not found', 404);

    const finalMaxMarks = maxMarks !== undefined ? Number(maxMarks) : existing.maxMarks;
    const finalObtainedMarks = obtainedMarks !== undefined ? Number(obtainedMarks) : existing.obtainedMarks;

    if (finalObtainedMarks < 0) return apiError('Obtained marks cannot be negative', 400);
    if (finalObtainedMarks > finalMaxMarks) return apiError('Obtained marks cannot exceed max marks', 400);

    const percentage = finalMaxMarks > 0
      ? Math.round((finalObtainedMarks / finalMaxMarks) * 10000) / 100
      : 0;
    const grade = calculateGrade(percentage);
    const isPass = percentage >= 35;

    const updated = await MarkDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          maxMarks: finalMaxMarks,
          obtainedMarks: finalObtainedMarks,
          grade,
          percentage,
          isPass,
          remarks: remarks !== undefined ? remarks : existing.remarks,
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'mark_updated',
      entityType: 'mark',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: { maxMarks: finalMaxMarks, obtainedMarks: finalObtainedMarks, grade, percentage, isPass },
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), grade, percentage, isPass },
      'Mark updated successfully'
    );
  } catch (error) {
    console.error('Update mark error:', error);
    return apiError('An error occurred', 500);
  }
}
