export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function POST(
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
    const { studentId } = body;

    if (!studentId) return apiError('studentId is required', 400);
    if (!mongoose.Types.ObjectId.isValid(studentId)) return apiError('Invalid studentId', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const [parent, student] = await Promise.all([
      ParentDoc.findOne({ _id: params.id, instituteId: instituteObjId, deletedAt: null }).lean(),
      StudentDoc.findOne({ _id: studentId, instituteId: instituteObjId, deletedAt: null }).lean(),
    ]);

    if (!parent) return apiError('Parent not found', 404);
    if (!student) return apiError('Student not found', 404);

    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const alreadyLinked = (parent.children || []).some(
      (c) => c.toString() === studentObjId.toString()
    );
    if (alreadyLinked) return apiError('Student is already linked to this parent', 409);

    await ParentDoc.findByIdAndUpdate(params.id, {
      $addToSet: { children: studentObjId },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_student_linked',
      entityType: 'parent',
      entityId: params.id,
      newValues: { studentId },
      request,
    });

    return apiSuccess(
      { parentId: params.id, studentId },
      'Student linked to parent successfully'
    );
  } catch (error) {
    console.error('Link student to parent error:', error);
    return apiError('An error occurred', 500);
  }
}
