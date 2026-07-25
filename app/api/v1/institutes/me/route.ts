export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'institute_admin') return apiError('Unauthorized', 403);
    if (!user.instituteId) return apiError('No institute', 400);

    const { data, error } = await supabase
      .from('institutes')
      .select('id, name, code, type, address, city, state, country, pincode, phone, alt_phone, email, website, logo_url, status, established_year, student_limit, teacher_limit, parent_limit')
      .eq('id', user.instituteId)
      .single();

    if (error) throw error;
    return apiSuccess(data);
  } catch (err) {
    console.error(err);
    return apiError('Failed to fetch institute', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'institute_admin') return apiError('Unauthorized', 403);
    if (!user.instituteId) return apiError('No institute', 400);

    const body = await request.json();
    const allowed = ['name', 'address', 'city', 'state', 'country', 'pincode', 'phone', 'alt_phone', 'email', 'website'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const { data, error } = await supabase
      .from('institutes')
      .update(updateData)
      .eq('id', user.instituteId)
      .select()
      .single();

    if (error) throw error;
    return apiSuccess(data, 'Institute updated');
  } catch (err) {
    console.error(err);
    return apiError('Failed to update institute', 500);
  }
}
