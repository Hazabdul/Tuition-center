export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    await dbConnect();

    const batch = await BatchDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    })
      .populate('students', '_id studentId admissionNumber firstName lastName email phone isActive')
      .populate('teachers', '_id teacherId firstName lastName email phone specialization isActive')
      .populate('subjects', '_id name code maxMarks passingMarks isActive')
      .lean();

    if (!batch) return apiError('Batch not found', 404);

    return apiSuccess({
      id: batch._id.toString(),
      name: batch.name,
      code: batch.code,
      academicYear: batch.academicYear ?? null,
      startDate: batch.startDate ?? null,
      endDate: batch.endDate ?? null,
      startTime: batch.startTime ?? null,
      endTime: batch.endTime ?? null,
      capacity: batch.capacity,
      description: batch.description ?? null,
      isActive: batch.isActive,
      createdAt: batch.createdAt,
      students: (batch.students || []).map((st: any) => ({ id: st._id?.toString(), ...st })),
      teachers: (batch.teachers || []).map((tch: any) => ({ id: tch._id?.toString(), ...tch })),
      subjects: (batch.subjects || []).map((sub: any) => ({ id: sub._id?.toString(), ...sub })),
    });
  } catch (error) {
    console.error('Get batch error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    const body = await request.json();
    const { name, code, academicYear, startDate, endDate, startTime, endTime, capacity, description } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existing = await BatchDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!existing) return apiError('Batch not found', 404);

    if (code && code !== existing.code) {
      const codeConflict = await BatchDoc.findOne({
        instituteId: instituteObjId,
        code: code.trim(),
        _id: { $ne: params.id },
        deletedAt: null,
      }).lean();
      if (codeConflict) return apiError('Batch code already exists in this institute', 409);
    }

    if (capacity !== undefined && capacity !== null && capacity < 1) {
      return apiError('Capacity must be a positive number', 400);
    }

    const updated = await BatchDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(code !== undefined && { code: code.trim() }),
          ...(academicYear !== undefined && { academicYear }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(startTime !== undefined && { startTime }),
          ...(endTime !== undefined && { endTime }),
          ...(capacity !== undefined && { capacity }),
          ...(description !== undefined && { description }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch_updated',
      entityType: 'batch',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), name: updated?.name, code: updated?.code },
      'Batch updated successfully'
    );
  } catch (error) {
    console.error('Update batch error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid batch id', 400);

    await dbConnect();

    const existing = await BatchDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Batch not found', 404);

    await BatchDoc.findByIdAndUpdate(params.id, {
      $set: { isActive: false, deletedAt: new Date() },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch_deleted',
      entityType: 'batch',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Batch deleted successfully');
  } catch (error) {
    console.error('Delete batch error:', error);
    return apiError('An error occurred', 500);
  }
}
