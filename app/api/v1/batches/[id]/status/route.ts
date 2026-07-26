export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') return apiError('isActive (boolean) is required', 400);

    await dbConnect();

    const existing = await BatchDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Batch not found', 404);

    const updated = await BatchDoc.findByIdAndUpdate(
      params.id,
      { $set: { isActive } },
      { new: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: isActive ? 'batch_activated' : 'batch_deactivated',
      entityType: 'batch',
      entityId: params.id,
      oldValues: { isActive: existing.isActive } as Record<string, unknown>,
      newValues: { isActive },
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), isActive: updated?.isActive },
      `Batch ${isActive ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    console.error('Update batch status error:', error);
    return apiError('An error occurred', 500);
  }
}
