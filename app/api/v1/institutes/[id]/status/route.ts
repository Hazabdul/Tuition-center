export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid institute id', 400);

    const body = await request.json();
    const { status } = body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return apiError('Invalid status. Must be one of: active, inactive, suspended', 400);
    }

    await dbConnect();

    const existing = await InstituteDoc.findOne({
      _id: params.id,
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Institute not found', 404);

    await InstituteDoc.findByIdAndUpdate(params.id, { $set: { status } });

    await logActivity({
      userId: user.id,
      action: 'institute_status_changed',
      entityType: 'institute',
      entityId: params.id,
      oldValues: { status: existing.status } as Record<string, unknown>,
      newValues: { status },
      request,
    });

    return apiSuccess(null, `Institute ${status} successfully`);
  } catch (error) {
    console.error('Institute status error:', error);
    return apiError('An error occurred', 500);
  }
}
