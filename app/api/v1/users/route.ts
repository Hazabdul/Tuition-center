export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import UserDoc from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['super_admin', 'institute_admin'].includes(user.role)) {
      return apiError('Unauthorized', 403);
    }

    await dbConnect();

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const roleFilter = url.searchParams.get('role') || '';
    const isActiveParam = url.searchParams.get('isActive');

    const filter: Record<string, unknown> = {
      deletedAt: null,
      role: { $ne: 'super_admin' },
    };

    if (user.role !== 'super_admin' && user.instituteId) {
      filter.instituteId = new mongoose.Types.ObjectId(user.instituteId);
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ];
    }

    if (roleFilter) filter.role = roleFilter;
    if (isActiveParam !== null && isActiveParam !== '') {
      filter.isActive = isActiveParam === 'true';
    }

    const [records, total] = await Promise.all([
      UserDoc.find(filter)
        .select('_id instituteId role username email phone firstName lastName isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserDoc.countDocuments(filter),
    ]);

    const data = records.map((r) => ({
      id: r._id.toString(),
      instituteId: r.instituteId ? r.instituteId.toString() : null,
      role: r.role,
      username: r.username ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      firstName: r.firstName,
      lastName: r.lastName ?? null,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));

    return apiSuccess(data, 'Users fetched', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List users error:', err);
    return apiError('Failed to fetch users', 500);
  }
}
