export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('parents')
      .select('id, first_name, last_name, email, phone, alt_phone, relationship, occupation, is_active, created_at', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Parents fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
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
    const { firstName, lastName, email, phone, altPhone, address, relationship, occupation, notes, username, password } = body;

    if (!firstName) return apiError('First name is required', 400);

    let userId: string | null = null;
    if (username && password) {
      const { data: existingUser } = await supabase.from('users').select('id').eq('institute_id', user.instituteId).eq('username', username).maybeSingle();
      if (existingUser) return apiError('Username already exists', 409);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          institute_id: user.instituteId,
          role: 'parent',
          username, email, phone,
          password_hash: hashPassword(password),
          first_name: firstName, last_name: lastName,
          is_active: true,
        })
        .select('id')
        .single();
      if (userError) return apiError(userError.message, 400);
      userId = newUser.id;
    }

    const { data: parent, error } = await supabase
      .from('parents')
      .insert({
        institute_id: user.instituteId,
        user_id: userId,
        first_name: firstName, last_name: lastName,
        email, phone, alt_phone: altPhone,
        address, relationship, occupation, notes,
        is_active: true,
      })
      .select('id, first_name, last_name')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'parent_created', entityType: 'parent', entityId: parent.id, newValues: body, request });

    return apiSuccess(parent, 'Parent created successfully');
  } catch (error) {
    console.error('Create parent error:', error);
    return apiError('An error occurred', 500);
  }
}
