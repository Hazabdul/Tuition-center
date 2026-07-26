export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid parent id', 400);
    if (!mongoose.Types.ObjectId.isValid(params.studentId)) return apiError('Invalid student id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.studentId);

    const parent = await ParentDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!parent) return apiError('Parent not found', 404);

    const isLinked = (parent.children || []).some(
      (c) => c.toString() === studentObjId.toString()
    );
    if (!isLinked) return apiError('Student is not linked to this parent', 404);

    await ParentDoc.findByIdAndUpdate(params.id, {
      $pull: { children: studentObjId },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_student_unlinked',
      entityType: 'parent',
      entityId: params.id,
      oldValues: { studentId: params.studentId },
      request,
    });

    return apiSuccess(null, 'Student unlinked from parent successfully');
  } catch (error) {
    console.error('Unlink student from parent error:', error);
    return apiError('An error occurred', 500);
  }
}
