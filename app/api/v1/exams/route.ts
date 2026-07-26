export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ExamDoc from '@/models/Exam';
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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const batchId = searchParams.get('batchId') || searchParams.get('batch_id') || '';
    const status = searchParams.get('status') || '';

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
    };

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) filter.batchId = new mongoose.Types.ObjectId(batchId);
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      ExamDoc.find(filter)
        .populate('batchId', '_id name code')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamDoc.countDocuments(filter),
    ]);

    const formattedData = records.map((exam) => ({
      id: exam._id.toString(),
      name: exam.name,
      code: exam.code,
      academicYear: exam.academicYear ?? null,
      startDate: exam.startDate ?? null,
      endDate: exam.endDate ?? null,
      status: exam.status,
      batch: exam.batchId,
      createdAt: exam.createdAt,
    }));

    return apiSuccess(formattedData, 'Exams fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List exams error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const batchId = body.batchId || body.batch_id;
    const name = body.name;
    let code = (body.code || name?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || '').toUpperCase().trim();
    if (!code) code = `EXAM${Math.floor(100 + Math.random() * 900)}`;

    const academicYear = body.academicYear || body.academic_year;
    const startDate = body.startDate || body.start_date;
    const endDate = body.endDate || body.end_date;
    const description = body.description;

    if (!batchId || !name) {
      return apiError('Batch ID and exam name are required', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(batchId)) return apiError('Invalid batch id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const batchObjId = new mongoose.Types.ObjectId(batchId);

    const batch = await BatchDoc.findOne({
      _id: batchObjId,
      instituteId: instituteObjId,
      deletedAt: null,
    }).lean();

    if (!batch) return apiError('Batch not found', 404);

    const existingCode = await ExamDoc.findOne({
      instituteId: instituteObjId,
      code,
    }).lean();

    if (existingCode) return apiError('Exam with this code already exists in the institute', 409);

    const exam: any = await ExamDoc.create({
      instituteId: instituteObjId,
      batchId: batchObjId,
      name: name.trim(),
      code,
      academicYear: academicYear || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalMarks: 100,
      passingMarks: 35,
      status: 'draft',
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'exam_created',
      entityType: 'exam',
      entityId: exam._id.toString(),
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: exam._id.toString(), name: exam.name, code: exam.code },
      'Exam created successfully'
    );
  } catch (error) {
    console.error('Create exam error:', error);
    return apiError('An error occurred', 500);
  }
}
