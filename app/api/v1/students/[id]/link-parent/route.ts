export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import ParentDoc from '@/models/Parent';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid student id', 400);

    const body = await request.json();
    const { parentId } = body;

    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return apiError('Valid parentId is required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const studentObjId = new mongoose.Types.ObjectId(params.id);
    const parentObjId = new mongoose.Types.ObjectId(parentId);

    const [student, parent] = await Promise.all([
      StudentDoc.findOne({ _id: studentObjId, instituteId: instituteObjId, deletedAt: null }).lean(),
      ParentDoc.findOne({ _id: parentObjId, instituteId: instituteObjId, deletedAt: null }).lean(),
    ]);

    if (!student) return apiError('Student not found', 404);
    if (!parent) return apiError('Parent not found', 404);

    const alreadyLinked = (parent.children || []).some(
      (c) => c.toString() === studentObjId.toString()
    );
    if (alreadyLinked) return apiError('Parent is already linked to this student', 409);

    await ParentDoc.findByIdAndUpdate(parentObjId, {
      $addToSet: { children: studentObjId },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_student_linked',
      entityType: 'student',
      entityId: params.id,
      newValues: { parentId },
      request,
    });

    return apiSuccess(
      { studentId: params.id, parentId },
      'Parent linked to student successfully'
    );
  } catch (error) {
    console.error('Link parent to student error:', error);
    return apiError('An error occurred', 500);
  }
}
