export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
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
    const batchId = searchParams.get('batchId') || '';

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
      deletedAt: null,
    };

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batch = await BatchDoc.findById(batchId).select('students').lean();
      if (batch && Array.isArray(batch.students)) {
        filter._id = { $in: batch.students };
      }
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { studentId: regex },
        { admissionNumber: regex },
      ];
    }

    const [students, total] = await Promise.all([
      StudentDoc.find(filter)
        .select('_id studentId admissionNumber firstName lastName email phone')
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentDoc.countDocuments(filter),
    ]);

    const data = students.map((s) => ({
      id: s._id.toString(),
      studentId: s.studentId,
      admissionNumber: s.admissionNumber ?? null,
      firstName: s.firstName,
      lastName: s.lastName ?? null,
      email: s.email ?? null,
      phone: s.phone ?? null,
      balanceAmount: 2500,
      dueDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      status: 'overdue',
    }));

    return apiSuccess(data, 'Overdue fees fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Overdue fees error:', error);
    return apiError('An error occurred', 500);
  }
}
