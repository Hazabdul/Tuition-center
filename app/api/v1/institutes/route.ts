export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import UserDoc from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const query: Record<string, unknown> = { deletedAt: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const total = await InstituteDoc.countDocuments(query);
    const institutes = await InstituteDoc.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = institutes.map((inst) => ({
      ...inst,
      id: inst._id.toString(),
      student_limit: inst.studentLimit,
      teacher_limit: inst.teacherLimit,
      admin_limit: inst.adminLimit,
      state_region: inst.stateRegion,
      postal_code: inst.postalCode,
      created_at: inst.createdAt.toISOString(),
    }));

    return apiSuccess(formatted, 'Institutes fetched', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List institutes error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const body = await request.json();
    const {
      name,
      code,
      email,
      phone,
      altPhone,
      address,
      city,
      stateRegion,
      country,
      postalCode,
      contactPersonName,
      contactPersonPhone,
      contactPersonEmail,
      studentLimit,
      teacherLimit,
      adminLimit,
      notes,
    } = body;

    if (!name || !code || !email || !phone || !city) {
      return apiError('Name, code, email, phone, and city are required', 400);
    }

    const existing = await InstituteDoc.findOne({ code: code.toUpperCase() });
    if (existing) return apiError('Institute code already exists', 409);

    const institute = await InstituteDoc.create({
      name,
      code: code.toUpperCase(),
      email: email || null,
      phone: phone || null,
      altPhone: altPhone || null,
      address: address || null,
      city: city || null,
      stateRegion: stateRegion || null,
      country: country || 'India',
      postalCode: postalCode || null,
      contactPersonName: contactPersonName || null,
      contactPersonPhone: contactPersonPhone || null,
      contactPersonEmail: contactPersonEmail || null,
      studentLimit: studentLimit || 100,
      teacherLimit: teacherLimit || 20,
      adminLimit: adminLimit || 3,
      notes: notes || null,
      status: 'active',
    });

    // Auto-create Primary Institute Admin User
    const adminUserEmail = body.adminEmail || email || `admin@${code.toLowerCase()}.com`;
    const adminUsername = body.adminUsername || `admin_${code.toLowerCase()}`;
    const adminPassword = body.adminPassword || 'Password@123';
    const pwdHash = hashPassword(adminPassword);

    await UserDoc.create({
      instituteId: institute._id,
      role: 'institute_admin',
      username: adminUsername,
      email: adminUserEmail,
      passwordHash: pwdHash,
      firstName: body.adminFirstName || contactPersonName || 'Institute',
      lastName: body.adminLastName || 'Admin',
      phone: contactPersonPhone || phone || null,
      isActive: true,
    });

    await logActivity({
      userId: user.id,
      action: 'institute_created',
      entityType: 'institute',
      entityId: institute._id.toString(),
      newValues: { name, code },
      request,
    });

    return apiSuccess(
      {
        id: institute._id.toString(),
        name: institute.name,
        code: institute.code,
        adminCredentials: { username: adminUsername, email: adminUserEmail, password: adminPassword },
      },
      'Institute and admin account created successfully'
    );
  } catch (error) {
    console.error('Create institute error:', error);
    return apiError('An error occurred', 500);
  }
}
