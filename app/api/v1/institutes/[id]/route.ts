export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import StudentDoc from '@/models/Student';
import TeacherDoc from '@/models/Teacher';
import UserDoc from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const institute = await InstituteDoc.findOne({ _id: params.id, deletedAt: null }).lean();
    if (!institute) return apiError('Institute not found', 404);

    const studentCount = await StudentDoc.countDocuments({ instituteId: params.id, deletedAt: null });
    const teacherCount = await TeacherDoc.countDocuments({ instituteId: params.id, deletedAt: null });
    const adminCount = await UserDoc.countDocuments({ instituteId: params.id, role: 'institute_admin', deletedAt: null });

    return apiSuccess({
      id: institute._id.toString(),
      name: institute.name,
      code: institute.code,
      email: institute.email,
      phone: institute.phone,
      alt_phone: institute.altPhone,
      address: institute.address,
      city: institute.city,
      state_region: institute.stateRegion,
      country: institute.country,
      postal_code: institute.postalCode,
      contact_person_name: institute.contactPersonName,
      contact_person_phone: institute.contactPersonPhone,
      contact_person_email: institute.contactPersonEmail,
      student_limit: institute.studentLimit,
      teacher_limit: institute.teacherLimit,
      admin_limit: institute.adminLimit,
      notes: institute.notes,
      status: institute.status,
      created_at: institute.createdAt.toISOString(),
      usage: { students: studentCount, teachers: teacherCount, admins: adminCount },
      subscriptionHistory: [],
    });
  } catch (error) {
    console.error('Get institute error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const body = await request.json();
    const {
      name,
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

    const existing = await InstituteDoc.findById(params.id).lean();
    if (!existing) return apiError('Institute not found', 404);

    const updated = await InstituteDoc.findByIdAndUpdate(
      params.id,
      {
        name,
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
      },
      { new: true }
    ).lean();

    await logActivity({
      userId: user.id,
      action: 'institute_updated',
      entityType: 'institute',
      entityId: params.id,
      oldValues: existing ? (existing.toObject() as unknown as Record<string, unknown>) : null,
      newValues: body,
      request,
    });

    return apiSuccess(
      {
        id: updated!._id.toString(),
        name: updated!.name,
        code: updated!.code,
      },
      'Institute updated successfully'
    );
  } catch (error) {
    console.error('Update institute error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    await dbConnect();

    const existing = await InstituteDoc.findById(params.id);
    if (!existing) return apiError('Institute not found', 404);

    await InstituteDoc.findByIdAndUpdate(params.id, {
      status: 'deleted',
      deletedAt: new Date(),
    });

    await logActivity({
      userId: user.id,
      action: 'institute_deleted',
      entityType: 'institute',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Institute deleted successfully');
  } catch (error) {
    console.error('Delete institute error:', error);
    return apiError('An error occurred', 500);
  }
}
