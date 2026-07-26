export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'institute_admin') return apiError('Unauthorized', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const institute = await InstituteDoc.findOne({
      _id: user.instituteId,
      deletedAt: null,
    }).lean();

    if (!institute) return apiError('Institute not found', 404);

    return apiSuccess({
      id: institute._id.toString(),
      name: institute.name,
      code: institute.code,
      address: institute.address ?? null,
      city: institute.city ?? null,
      stateRegion: institute.stateRegion ?? null,
      country: institute.country,
      postalCode: institute.postalCode ?? null,
      phone: institute.phone ?? null,
      altPhone: institute.altPhone ?? null,
      email: institute.email ?? null,
      logoUrl: institute.logoUrl ?? null,
      status: institute.status,
      studentLimit: institute.studentLimit,
      teacherLimit: institute.teacherLimit,
      adminLimit: institute.adminLimit,
      createdAt: institute.createdAt,
    });
  } catch (err) {
    console.error('Get my institute error:', err);
    return apiError('Failed to fetch institute', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'institute_admin') return apiError('Unauthorized', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const allowed = ['name', 'address', 'city', 'stateRegion', 'country', 'postalCode', 'phone', 'altPhone', 'email', 'logoUrl'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    await dbConnect();

    const updated = await InstituteDoc.findByIdAndUpdate(
      user.instituteId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return apiError('Institute not found', 404);

    return apiSuccess({ id: updated._id.toString(), ...updated }, 'Institute updated');
  } catch (err) {
    console.error('Update my institute error:', err);
    return apiError('Failed to update institute', 500);
  }
}
