export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    await dbConnect();

    const exam = await ExamDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    })
      .populate('batchId', '_id name code academicYear')
      .lean();

    if (!exam) return apiError('Exam not found', 404);

    return apiSuccess({
      id: exam._id.toString(),
      name: exam.name,
      code: exam.code,
      academicYear: exam.academicYear ?? null,
      startDate: exam.startDate ?? null,
      endDate: exam.endDate ?? null,
      status: exam.status,
      batch: exam.batchId,
      createdAt: exam.createdAt,
    }, 'Exam fetched successfully');
  } catch (error) {
    console.error('Get exam error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    const body = await request.json();
    const { name, code, academicYear, startDate, endDate } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existing = await ExamDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
    }).lean();

    if (!existing) return apiError('Exam not found', 404);

    let updatedCode = existing.code;
    if (code) {
      updatedCode = code.toUpperCase().trim();
      if (updatedCode !== existing.code) {
        const conflict = await ExamDoc.findOne({
          instituteId: instituteObjId,
          code: updatedCode,
          _id: { $ne: params.id },
        }).lean();
        if (conflict) return apiError('Exam with this code already exists in the institute', 409);
      }
    }

    const updated = await ExamDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          code: updatedCode,
          ...(academicYear !== undefined && { academicYear }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_updated',
      entityType: 'exam',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), name: updated?.name, code: updated?.code },
      'Exam updated successfully'
    );
  } catch (error) {
    console.error('Update exam error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid exam id', 400);

    await dbConnect();

    const existing = await ExamDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    }).lean();

    if (!existing) return apiError('Exam not found', 404);

    await ExamDoc.findByIdAndDelete(params.id);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_deleted',
      entityType: 'exam',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Exam deleted successfully');
  } catch (error) {
    console.error('Delete exam error:', error);
    return apiError('An error occurred', 500);
  }
}
