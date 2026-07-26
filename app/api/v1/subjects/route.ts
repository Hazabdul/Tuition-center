export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubjectDoc from '@/models/Subject';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const filter: Record<string, unknown> = {
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      deletedAt: null,
    };

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      SubjectDoc.find(filter)
        .select('_id name code description syllabus maxMarks passingMarks isActive createdAt')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      SubjectDoc.countDocuments(filter),
    ]);

    const data = records.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      code: s.code,
      description: s.description ?? null,
      syllabus: s.syllabus ?? null,
      maxMarks: s.maxMarks,
      passingMarks: s.passingMarks,
      isActive: s.isActive,
      createdAt: s.createdAt,
    }));

    return apiSuccess(data, 'Subjects fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List subjects error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { name, code, description, syllabus, maxMarks, passingMarks, batchIds } = body;

    if (!name) return apiError('Subject name is required', 400);

    let finalCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase().trim();
    if (!finalCode) finalCode = `SUB${Math.floor(100 + Math.random() * 900)}`;

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existing = await SubjectDoc.findOne({
      instituteId: instituteObjId,
      code: finalCode,
      deletedAt: null,
    }).lean();

    if (existing) {
      if (!code) {
        finalCode = `${finalCode}${Math.floor(10 + Math.random() * 90)}`;
      } else {
        return apiError(`Subject code "${finalCode}" already exists. Please choose a unique code.`, 409);
      }
    }

    if (maxMarks !== undefined && passingMarks !== undefined && Number(passingMarks) > Number(maxMarks)) {
      return apiError('Passing marks cannot exceed max marks', 400);
    }

    const subject = await SubjectDoc.create({
      instituteId: instituteObjId,
      name: name.trim(),
      code: finalCode,
      description: description || null,
      syllabus: syllabus || null,
      maxMarks: maxMarks ? Number(maxMarks) : 100,
      passingMarks: passingMarks ? Number(passingMarks) : 40,
      isActive: true,
    });

    if (Array.isArray(batchIds) && batchIds.length > 0) {
      const validBatchIds = batchIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      if (validBatchIds.length > 0) {
        await BatchDoc.updateMany(
          { _id: { $in: validBatchIds }, instituteId: instituteObjId },
          { $addToSet: { subjects: subject._id } }
        );
      }
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subject_created',
      entityType: 'subject',
      entityId: subject._id.toString(),
      newValues: { name, code: finalCode },
      request,
    });

    return apiSuccess(
      { id: subject._id.toString(), name: subject.name, code: subject.code },
      'Subject created successfully'
    );
  } catch (error) {
    console.error('Create subject error:', error);
    return apiError('An error occurred', 500);
  }
}
