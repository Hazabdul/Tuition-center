export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ActivityLogDoc from '@/models/ActivityLog';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const action = searchParams.get('action') || '';

    const filter: Record<string, unknown> = {};

    if (user.role !== 'super_admin' && user.instituteId) {
      filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
    }
    if (action) filter.action = action;

    const [records, total] = await Promise.all([
      ActivityLogDoc.find(filter)
        .populate('userId', '_id firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLogDoc.countDocuments(filter),
    ]);

    const data = records.map((a: any) => {
      const u = a.userId;
      const userName = u
        ? `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim() || 'User'
        : 'System';

      return {
        id: a._id.toString(),
        instituteId: a.instituteId?.toString() ?? null,
        userId: a.userId,
        userName,
        user_name: userName,
        action: a.action,
        entityType: a.entityType ?? null,
        entity_type: a.entityType ?? null,
        entityId: a.entityId ?? null,
        entity_id: a.entityId ?? null,
        ipAddress: a.ipAddress ?? null,
        ip_address: a.ipAddress ?? null,
        createdAt: a.createdAt,
        created_at: a.createdAt,
      };
    });

    return apiSuccess(data, 'Activity logs fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List activity logs error:', error);
    return apiError('An error occurred', 500);
  }
}
