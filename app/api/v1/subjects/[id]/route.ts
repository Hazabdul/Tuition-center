export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubjectDoc from '@/models/Subject';
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subject id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const subjectObjId = new mongoose.Types.ObjectId(params.id);

    const subject = await SubjectDoc.findOne({
      _id: subjectObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!subject) return apiError('Subject not found', 404);

    const linkedBatches = await BatchDoc.find({
      subjects: subjectObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    })
      .select('_id name code academicYear startDate endDate isActive')
      .lean();

    return apiSuccess({
      id: subject._id.toString(),
      name: subject.name,
      code: subject.code,
      description: subject.description ?? null,
      syllabus: subject.syllabus ?? null,
      maxMarks: subject.maxMarks,
      passingMarks: subject.passingMarks,
      isActive: subject.isActive,
      createdAt: subject.createdAt,
      batches: linkedBatches.map((b) => ({ id: b._id.toString(), ...b })),
    });
  } catch (error) {
    console.error('Get subject error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subject id', 400);

    const body = await request.json();
    const { name, code, description, syllabus, maxMarks, passingMarks } = body;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existing = await SubjectDoc.findOne({
      _id: params.id,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Subject not found', 404);

    let updatedCode = existing.code;
    if (code) {
      updatedCode = code.toUpperCase().trim();
      if (updatedCode !== existing.code) {
        const codeConflict = await SubjectDoc.findOne({
          instituteId: instituteObjId,
          code: updatedCode,
          _id: { $ne: params.id },
          deletedAt: null,
        }).lean();
        if (codeConflict) {
          return apiError(`Subject code "${updatedCode}" is already used by another subject.`, 409);
        }
      }
    }

    if (maxMarks !== undefined && passingMarks !== undefined && Number(passingMarks) > Number(maxMarks)) {
      return apiError('Passing marks cannot exceed max marks', 400);
    }

    const updated = await SubjectDoc.findByIdAndUpdate(
      params.id,
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          code: updatedCode,
          ...(description !== undefined && { description }),
          ...(syllabus !== undefined && { syllabus: syllabus || null }),
          ...(maxMarks !== undefined && { maxMarks: Number(maxMarks) }),
          ...(passingMarks !== undefined && { passingMarks: Number(passingMarks) }),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_updated',
      entityType: 'subject',
      entityId: params.id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: updated?._id.toString(), name: updated?.name, code: updated?.code },
      'Subject updated successfully'
    );
  } catch (error) {
    console.error('Update subject error:', error);
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) return apiError('Invalid subject id', 400);

    await dbConnect();

    const existing = await SubjectDoc.findOne({
      _id: params.id,
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    }).lean();
    if (!existing) return apiError('Subject not found', 404);

    await SubjectDoc.findByIdAndUpdate(params.id, {
      $set: { isActive: false, deletedAt: new Date() },
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_deleted',
      entityType: 'subject',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Subject deleted successfully');
  } catch (error) {
    console.error('Delete subject error:', error);
    return apiError('An error occurred', 500);
  }
}
