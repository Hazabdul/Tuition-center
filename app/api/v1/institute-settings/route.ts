export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const institute = await InstituteDoc.findById(instituteId).lean();

    if (!institute) return apiError('Institute not found', 404);

    let branding = {
      logoUrl: '',
      tagline: 'Excellence in Education',
      primaryColor: '#2563eb',
      receiptHeader: institute.name,
      receiptFooter: 'Thank you for your payment. This is a computer-generated receipt.',
      principalName: institute.contactPersonName || 'Principal',
    };

    if (institute.notes) {
      try {
        const parsed = JSON.parse(institute.notes);
        if (parsed.branding) branding = { ...branding, ...parsed.branding };
      } catch {}
    }

    return apiSuccess(
      {
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
        notes: institute.notes,
        branding,
      },
      'Institute settings fetched'
    );
  } catch (error) {
    console.error('Fetch institute settings error:', error);
    return apiError('Failed to fetch settings', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    await dbConnect();

    const body = await request.json();
    const { name, email, phone, address, city, stateRegion, postalCode, branding } = body;

    const existing = await InstituteDoc.findById(instituteId).lean();
    if (!existing) return apiError('Institute not found', 404);

    let existingNotesObj: Record<string, unknown> = {};
    if (existing.notes) {
      try {
        existingNotesObj = JSON.parse(existing.notes);
      } catch {}
    }

    const updatedNotesObj = {
      ...existingNotesObj,
      branding: branding || existingNotesObj.branding || {},
    };

    const updated = await InstituteDoc.findByIdAndUpdate(
      instituteId,
      {
        name,
        email,
        phone,
        address,
        city,
        stateRegion,
        postalCode,
        notes: JSON.stringify(updatedNotesObj),
      },
      { new: true }
    ).lean();

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'institute.update_settings',
      entityType: 'institute',
      entityId: instituteId,
      newValues: body,
      request,
    });

    return apiSuccess(updated, 'Institute branding and document settings updated');
  } catch (error) {
    console.error('Update institute settings error:', error);
    return apiError('Failed to update settings', 500);
  }
}
