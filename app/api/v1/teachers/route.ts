export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import TeacherDoc from '@/models/Teacher';
import UserDoc from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin' && !user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const query: Record<string, unknown> = { deletedAt: null };
    if (user.role !== 'super_admin' && user.instituteId) {
      query.instituteId = user.instituteId;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { teacherId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const total = await TeacherDoc.countDocuments(query);
    const teachers = await TeacherDoc.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = teachers.map((t) => ({
      ...t,
      id: t._id.toString(),
      employee_id: t.teacherId,
      first_name: t.firstName,
      last_name: t.lastName,
      is_active: t.isActive,
      created_at: t.createdAt.toISOString(),
    }));

    return apiSuccess(formatted, 'Teachers fetched', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List teachers error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const body = await request.json();
    const { employeeId, firstName, lastName, email, phone, qualification, specialization, joiningDate, notes, username, password } = body;

    if (!employeeId || !firstName) return apiError('Employee ID and first name are required', 400);

    const dupTeacher = await TeacherDoc.findOne({
      instituteId: user.instituteId,
      teacherId: employeeId,
      deletedAt: null,
    });

    if (dupTeacher) return apiError('Teacher ID already exists in this institute', 409);

    let userId: any = null;
    if (username && password) {
      if (password.length < 6) return apiError('Password must be at least 6 characters', 400);

      const dupUser = await UserDoc.findOne({
        instituteId: user.instituteId,
        username,
      });

      if (dupUser) return apiError('Username already exists in this institute', 409);

      const newUser = await UserDoc.create({
        instituteId: user.instituteId,
        role: 'teacher',
        username,
        email: email || null,
        phone: phone || null,
        passwordHash: hashPassword(password),
        firstName,
        lastName: lastName || null,
        isActive: true,
      });
      userId = newUser._id;
    }

    const teacher = await TeacherDoc.create({
      instituteId: user.instituteId,
      userId,
      teacherId: employeeId,
      firstName,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      qualification: qualification || null,
      specialization: specialization || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      notes: notes || null,
      isActive: true,
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'teacher_created',
      entityType: 'teacher',
      entityId: teacher._id.toString(),
      newValues: body,
      request,
    });

    return apiSuccess({ ...teacher.toObject(), id: teacher._id.toString() }, 'Teacher created successfully', undefined);
  } catch (error) {
    console.error('Create teacher error:', error);
    return apiError('An error occurred', 500);
  }
}
