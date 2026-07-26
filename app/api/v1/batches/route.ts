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
      filter.$or = [{ name: regex }, { code: regex }, { academicYear: regex }];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      BatchDoc.find(filter)
        .select('_id name code academicYear startDate endDate startTime endTime capacity description isActive createdAt')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      BatchDoc.countDocuments(filter),
    ]);

    const data = records.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      code: b.code,
      academicYear: b.academicYear ?? null,
      startDate: b.startDate ?? null,
      endDate: b.endDate ?? null,
      startTime: b.startTime ?? null,
      endTime: b.endTime ?? null,
      capacity: b.capacity,
      description: b.description ?? null,
      isActive: b.isActive,
      createdAt: b.createdAt,
    }));

    return apiSuccess(data, 'Batches fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List batches error:', error);
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
    const { name, code, academicYear, startDate, endDate, startTime, endTime, capacity, description } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existingCode = await BatchDoc.findOne({
      instituteId: instituteObjId,
      code: code.trim(),
      deletedAt: null,
    }).lean();

    if (existingCode) return apiError('Batch code already exists in this institute', 409);

    if (capacity !== undefined && capacity !== null && capacity < 1) {
      return apiError('Capacity must be a positive number', 400);
    }

    const batch = await BatchDoc.create({
      instituteId: instituteObjId,
      name: name.trim(),
      code: code.trim(),
      academicYear: academicYear || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      capacity: capacity || 40,
      description: description || null,
      isActive: true,
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'batch_created',
      entityType: 'batch',
      entityId: batch._id.toString(),
      newValues: body,
      request,
    });

    return apiSuccess(
      { id: batch._id.toString(), name: batch.name, code: batch.code },
      'Batch created successfully'
    );
  } catch (error) {
    console.error('Create batch error:', error);
    return apiError('An error occurred', 500);
  }
}
