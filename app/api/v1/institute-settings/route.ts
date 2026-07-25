export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const { data: institute, error } = await supabase
      .from('institutes')
      .select('id, name, code, email, phone, alt_phone, address, city, state_region, country, postal_code, contact_person_name, notes')
      .eq('id', instituteId)
      .single();

    if (error || !institute) return apiError('Institute not found', 404);

    let branding = {
      logoUrl: '',
      tagline: 'Excellence in Education',
      primaryColor: '#2563eb',
      receiptHeader: institute.name,
      receiptFooter: 'Thank you for your payment. This is a computer-generated receipt.',
      principalName: institute.contact_person_name || 'Principal',
    };

    if (institute.notes) {
      try {
        const parsed = JSON.parse(institute.notes);
        if (parsed.branding) branding = { ...branding, ...parsed.branding };
      } catch {}
    }

    return apiSuccess({ ...institute, branding }, 'Institute settings fetched');
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

    const body = await request.json();
    const { name, email, phone, address, city, stateRegion, postalCode, branding } = body;

    const { data: existing } = await supabase
      .from('institutes')
      .select('notes')
      .eq('id', instituteId)
      .single();

    let existingNotesObj: Record<string, unknown> = {};
    if (existing?.notes) {
      try { existingNotesObj = JSON.parse(existing.notes); } catch {}
    }

    const updatedNotesObj = {
      ...existingNotesObj,
      branding: branding || existingNotesObj.branding || {},
    };

    const { data: institute, error } = await supabase
      .from('institutes')
      .update({
        name,
        email,
        phone,
        address,
        city,
        state_region: stateRegion,
        postal_code: postalCode,
        notes: JSON.stringify(updatedNotesObj),
        updated_at: new Date().toISOString(),
      })
      .eq('id', instituteId)
      .select()
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'institute.update_settings',
      entityType: 'institute',
      entityId: instituteId,
      newValues: body,
      request,
    });

    return apiSuccess(institute, 'Institute branding and document settings updated');
  } catch (error) {
    console.error('Update institute settings error:', error);
    return apiError('Failed to update settings', 500);
  }
}
