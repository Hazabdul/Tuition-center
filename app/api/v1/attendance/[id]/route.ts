export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid attendance id', 400);

    const body = await request.json();
    const { status, remarks } = body;

    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (status && !validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: present, absent, late, excused', 400);
    }

    await dbConnect();

    const existing = await AttendanceDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
    }).lean();

    if (!existing) return apiError('Attendance record not found', 404);

    const updated = await AttendanceDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(status && { status }),
          ...(remarks !== undefined && { remarks }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_updated',
      entityType: 'attendance',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), status: updated?.status, remarks: updated?.remarks },
      'Attendance updated successfully'
    );
  } catch (error) {
    console.error('Update attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
