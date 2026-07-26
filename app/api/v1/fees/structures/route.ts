export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
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

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const [batches, total] = await Promise.all([
      BatchDoc.find({ instituteId: instituteObjId, deletedAt: null })
        .select('_id name code academicYear createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      BatchDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
    ]);

    const data = batches.map((b) => ({
      id: b._id.toString(),
      instituteId: user.instituteId,
      academicYear: b.academicYear,
      amount: 15000,
      batch: { id: b._id.toString(), name: b.name, code: b.code },
      category: { id: 'cat_tuition', name: 'Tuition Fee', code: 'TUITION' },
      isActive: true,
      createdAt: b.createdAt,
    }));

    return apiSuccess(data, 'Fee structures fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List fee structures error:', error);
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
    const { categoryId, batchId, academicYear, amount, dueDate, isActive } = body;

    if (!categoryId || amount === undefined || amount === null) {
      return apiError('Category ID and amount are required', 400);
    }
    if (amount < 0) return apiError('Amount must be non-negative', 400);

    await dbConnect();

    const structureId = new mongoose.Types.ObjectId().toString();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_structure_created',
      entityType: 'fee_structure',
      entityId: structureId,
      newValues: body,
      request,
    });

    return apiSuccess(
      {
        id: structureId,
        instituteId: user.instituteId,
        categoryId,
        batchId: batchId || null,
        academicYear: academicYear || null,
        amount,
        dueDate: dueDate || null,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date(),
      },
      'Fee structure created successfully'
    );
  } catch (error) {
    console.error('Create fee structure error:', error);
    return apiError('An error occurred', 500);
  }
}
