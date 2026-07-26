export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid parent id', 400);

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') return apiError('isActive (boolean) is required', 400);

    await dbConnect();

    const existing = await ParentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Parent not found', 404);

    const updated = await ParentDoc.findByIdAndUpdate(
      params.id,
      { $set: { isActive } },
      { new: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: isActive ? 'parent_activated' : 'parent_deactivated',
      entityType: 'parent',
      entityId: params.id,
      oldValues: { isActive: existing.isActive } as Record<string, unknown>,
      newValues: { isActive },
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), isActive: updated?.isActive },
      `Parent ${isActive ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    console.error('Update parent status error:', error);
    return apiError('An error occurred', 500);
  }
}
