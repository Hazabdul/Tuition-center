export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import UserDoc from '@/models/User';
import StudentDoc from '@/models/Student';
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
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const sortField: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [records, total] = await Promise.all([
      ParentDoc.find(filter)
        .select('_id firstName lastName email phone altPhone relationship occupation children isActive createdAt')
        .populate({ path: 'children', select: '_id firstName lastName studentId' })
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      ParentDoc.countDocuments(filter),
    ]);

    const data = records.map((p: any) => ({
      id: p._id.toString(),
      firstName: p.firstName,
      first_name: p.firstName,
      lastName: p.lastName ?? null,
      last_name: p.lastName ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      altPhone: p.altPhone ?? null,
      relationship: p.relationship ?? null,
      occupation: p.occupation ?? null,
      isActive: p.isActive,
      is_active: p.isActive,
      createdAt: p.createdAt,
      created_at: p.createdAt,
      children: Array.isArray(p.children)
        ? p.children.map((c: any) => ({
            id: c._id ? c._id.toString() : c.id,
            first_name: c.firstName,
            last_name: c.lastName ?? null,
            student_id: c.studentId,
          }))
        : [],
    }));

    return apiSuccess(data, 'Parents fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List parents error:', error);
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
    const {
      firstName, lastName, email, phone, altPhone,
      address, relationship, occupation, notes, username, password, studentIds, children,
    } = body;

    const childIds = (studentIds || children || []).filter((id: string) => mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));

    if (!firstName) return apiError('First name is required', 400);

    await dbConnect();

    let userId: mongoose.Types.ObjectId | null = null;

    if (username && password) {
      const existingUser = await UserDoc.findOne({
        instituteId: new mongoose.Types.ObjectId(user.instituteId),
        username: username.trim(),
        deletedAt: null,
      }).lean();
      if (existingUser) return apiError('Username already exists', 409);

      const newUser = await UserDoc.create({
        instituteId: new mongoose.Types.ObjectId(user.instituteId),
        role: 'parent',
        username: username.trim(),
        email: email ? email.toLowerCase().trim() : null,
        phone: phone || null,
        passwordHash: hashPassword(password),
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        isActive: true,
      });
      userId = newUser._id as mongoose.Types.ObjectId;
    }

    const parent = await ParentDoc.create({
      instituteId: new mongoose.Types.ObjectId(user.instituteId),
      userId,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      altPhone: altPhone || null,
      address: address || null,
      relationship: relationship || null,
      occupation: occupation || null,
      notes: notes || null,
      children: childIds,
      isActive: true,
    });

    const parentFullName = `${firstName.trim()} ${lastName?.trim() || ''}`.trim();
    if (childIds.length > 0) {
      await StudentDoc.updateMany(
        { _id: { $in: childIds } },
        {
          $set: {
            fatherName: parentFullName,
            emergencyContactName: parentFullName,
            emergencyContactPhone: phone || null,
          },
        }
      );
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parent_created',
      entityType: 'parent',
      entityId: parent._id.toString(),
      newValues: { firstName, lastName, email, childrenCount: childIds.length },
      request,
    });

    return apiSuccess(
      { id: parent._id.toString(), firstName: parent.firstName, lastName: parent.lastName },
      'Parent created successfully'
    );
  } catch (error) {
    console.error('Create parent error:', error);
    return apiError('An error occurred', 500);
  }
}
