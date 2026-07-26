export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import TeacherDoc from '@/models/Teacher';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const teacher = await TeacherDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!teacher) return apiError('Teacher not found', 404);

    const linkedBatches = await BatchDoc.find({
      teachers: new mongoose.Types.ObjectId(params.id),
      instituteId: instituteObjId,
      deletedAt: null,
    })
      .select('_id name code academicYear')
      .lean();

    return apiSuccess({
      id: teacher._id.toString(),
      teacherId: teacher.teacherId,
      firstName: teacher.firstName,
      lastName: teacher.lastName ?? null,
      email: teacher.email ?? null,
      phone: teacher.phone ?? null,
      qualification: teacher.qualification ?? null,
      specialization: teacher.specialization ?? null,
      joiningDate: teacher.joiningDate ?? null,
      notes: teacher.notes ?? null,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      batches: linkedBatches.map((b) => ({ id: b._id.toString(), name: b.name, code: b.code })),
    });
  } catch (error) {
    console.error('Get teacher error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    const body = await request.json();
    const { employeeId, firstName, lastName, email, phone, qualification, specialization, joiningDate, notes } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existing = await TeacherDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Teacher not found', 404);

    if (employeeId && employeeId !== existing.teacherId) {
      const conflict = await TeacherDoc.findOne({
        instituteId: instituteObjId,
        teacherId: employeeId.trim(),
        _id: { $ne: params.id },
        deletedAt: null,
      }).lean();
      if (conflict) return apiError('Employee ID already exists in this institute', 409);
    }

    const updated = await TeacherDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(employeeId !== undefined && { teacherId: employeeId.trim() }),
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName?.trim() || null }),
          ...(email !== undefined && { email: email?.toLowerCase().trim() || null }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(qualification !== undefined && { qualification }),
          ...(specialization !== undefined && { specialization }),
          ...(joiningDate !== undefined && { joiningDate: joiningDate ? new Date(joiningDate) : null }),
          ...(notes !== undefined && { notes }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_updated',
      entityType: 'teacher',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), teacherId: updated?.teacherId, firstName: updated?.firstName, lastName: updated?.lastName },
      'Teacher updated successfully'
    );
  } catch (error) {
    console.error('Update teacher error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid teacher id', 400);

    await dbConnect();

    const existing = await TeacherDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Teacher not found', 404);

    await TeacherDoc.findByIdAndUpdate(params.id, {
      $set: { isActive: false, deletedAt: new Date() },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_deleted',
      entityType: 'teacher',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Teacher deleted successfully');
  } catch (error) {
    console.error('Delete teacher error:', error);
    return apiError('An error occurred', 500);
  }
}
