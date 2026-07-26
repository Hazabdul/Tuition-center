export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid parent id', 400);

    await dbConnect();

    const parent = await ParentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    })
      .populate('children', '_id studentId admissionNumber firstName lastName email phone isActive')
      .lean();

    if (!parent) return apiError('Parent not found', 404);

    return apiSuccess({
      id: parent._id.toString(),
      firstName: parent.firstName,
      lastName: parent.lastName ?? null,
      email: parent.email ?? null,
      phone: parent.phone ?? null,
      altPhone: parent.altPhone ?? null,
      address: parent.address ?? null,
      relationship: parent.relationship ?? null,
      occupation: parent.occupation ?? null,
      notes: parent.notes ?? null,
      isActive: parent.isActive,
      createdAt: parent.createdAt,
      children: (parent.children || []).map((ch: any) => ({ id: ch._id?.toString(), ...ch })),
    });
  } catch (error) {
    console.error('Get parent error:', error);
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
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid parent id', 400);

    const body = await request.json();
    const { firstName, lastName, email, phone, altPhone, address, relationship, occupation, notes } = body;

    await dbConnect();

    const existing = await ParentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Parent not found', 404);

    const updated = await ParentDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName?.trim() || null }),
          ...(email !== undefined && { email: email?.toLowerCase().trim() || null }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(altPhone !== undefined && { altPhone: altPhone || null }),
          ...(address !== undefined && { address }),
          ...(relationship !== undefined && { relationship }),
          ...(occupation !== undefined && { occupation }),
          ...(notes !== undefined && { notes }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_updated',
      entityType: 'parent',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), firstName: updated?.firstName, lastName: updated?.lastName },
      'Parent updated successfully'
    );
  } catch (error) {
    console.error('Update parent error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid parent id', 400);

    await dbConnect();

    const existing = await ParentDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Parent not found', 404);

    await ParentDoc.findByIdAndUpdate(params.id, {
      $set: { isActive: false, deletedAt: new Date() },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_deleted',
      entityType: 'parent',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Parent deleted successfully');
  } catch (error) {
    console.error('Delete parent error:', error);
    return apiError('An error occurred', 500);
  }
}
