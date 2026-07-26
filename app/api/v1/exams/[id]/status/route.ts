export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
import mongoose from 'mongoose';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled', 'published'],
  scheduled: ['completed', 'published', 'draft'],
  completed: ['published', 'draft'],
  published: ['draft', 'scheduled', 'completed'],
};

export async function PATCH(
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
    const { status } = body;

    const validStatuses = ['draft', 'scheduled', 'completed', 'published'];
    if (!status || !validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: draft, scheduled, completed, published', 400);
    }

    await dbConnect();

    const existing = await ExamDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    }).lean();

    if (!existing) return apiError('Exam not found', 404);

    if (existing.status === status) {
      return apiError(`Exam is already in ${status} status`, 400);
    }

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      return apiError(`Cannot transition from ${existing.status} to ${status}. Valid transitions: ${existing.status} -> ${allowed.join(' -> ')}`, 400);
    }

    const updated = await ExamDoc.findByIdAndUpdate(
      params.id,
      { $set: { status } },
      { new: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_status_changed',
      entityType: 'exam',
      entityId: params.id,
      oldValues: { status: existing.status } as Record<string, unknown>,
      newValues: { status },
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), status: updated?.status },
      `Exam status updated to ${status} successfully`
    );
  } catch (error) {
    console.error('Exam status error:', error);
    return apiError('An error occurred', 500);
  }
}
