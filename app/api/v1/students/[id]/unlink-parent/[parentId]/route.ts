export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; parentId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid student id', 400);
    if (!mongoose.Types.ObjectId.isValid(params.parentId)) return apiError('Invalid parent id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.id);
    const parentObjId = new mongoose.Types.ObjectId(params.parentId);

    await ParentDoc.findOneAndUpdate(
      { _id: parentObjId, instituteId: instituteObjId },
      { $pull: { children: studentObjId } }
    );

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_student_unlinked',
      entityType: 'student',
      entityId: params.id,
      oldValues: { parentId: params.parentId },
      request,
    });

    return apiSuccess(null, 'Parent unlinked from student successfully');
  } catch (error) {
    console.error('Unlink parent from student error:', error);
    return apiError('An error occurred', 500);
  }
}
