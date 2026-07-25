export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin') return apiError('Insufficient permissions', 403);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('institutes')
      .select('id, name, code, email, phone, city, state_region, country, status, student_limit, teacher_limit, admin_limit, created_at, deleted_at', { count: 'exact' })
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    const institutes = await Promise.all(
      (data || []).map(async (inst) => {
        const { data: sub } = await supabase
          .from('institute_subscriptions')
          .select('id, status, start_date, expiry_date, plan:subscription_plans(name, code)')
          .eq('institute_id', inst.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return { ...inst, subscription: sub };
      })
    );

    return apiSuccess(institutes, 'Institutes fetched', {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
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

    const body = await request.json();
    const { name, code, email, phone, altPhone, address, city, stateRegion, country, postalCode, contactPersonName, contactPersonPhone, contactPersonEmail, studentLimit, teacherLimit, adminLimit, notes, planId, startDate, expiryDate } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const { data: existing } = await supabase.from('institutes').select('id').eq('code', code).maybeSingle();
    if (existing) return apiError('Institute code already exists', 409);

    const { data: institute, error } = await supabase
      .from('institutes')
      .insert({
        name, code, email, phone, alt_phone: altPhone, address, city, state_region: stateRegion,
        country: country || 'India', postal_code: postalCode,
        contact_person_name: contactPersonName, contact_person_phone: contactPersonPhone, contact_person_email: contactPersonEmail,
        student_limit: studentLimit || 100, teacher_limit: teacherLimit || 20, admin_limit: adminLimit || 3,
        notes, status: 'active',
      })
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    if (planId) {
      await supabase.from('institute_subscriptions').insert({
        institute_id: institute.id,
        plan_id: planId,
        status: 'active',
        start_date: startDate || new Date().toISOString().split('T')[0],
        expiry_date: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      await supabase.from('subscription_history').insert({
        institute_id: institute.id,
        plan_id: planId,
        action: 'assigned',
        new_status: 'active',
        new_expiry: expiryDate,
        performed_by: user.id,
      });
    }

    // Auto-create Primary Institute Admin User
    const adminUserEmail = body.adminEmail || email || `admin@${code.toLowerCase()}.com`;
    const adminUsername = body.adminUsername || `admin_${code.toLowerCase()}`;
    const adminPassword = body.adminPassword || 'Password@123';
    const pwdHash = hashPassword(adminPassword);

    await supabase.from('users').insert({
      institute_id: institute.id,
      role: 'institute_admin',
      username: adminUsername,
      email: adminUserEmail,
      password_hash: pwdHash,
      first_name: body.adminFirstName || contactPersonName || 'Institute',
      last_name: body.adminLastName || 'Admin',
      phone: contactPersonPhone || phone,
      is_active: true,
    });

    // Auto-seed Default Grading Rules
    await supabase.from('grading_rules').insert([
      { institute_id: institute.id, min_percentage: 90, max_percentage: 100, grade: 'A+' },
      { institute_id: institute.id, min_percentage: 80, max_percentage: 89.99, grade: 'A' },
      { institute_id: institute.id, min_percentage: 70, max_percentage: 79.99, grade: 'B' },
      { institute_id: institute.id, min_percentage: 60, max_percentage: 69.99, grade: 'C' },
      { institute_id: institute.id, min_percentage: 50, max_percentage: 59.99, grade: 'D' },
      { institute_id: institute.id, min_percentage: 0, max_percentage: 49.99, grade: 'F' },
    ]);

    await logActivity({ userId: user.id, action: 'institute_created', entityType: 'institute', entityId: institute.id, newValues: { name, code }, request });

    return apiSuccess({
      ...institute,
      adminCredentials: { username: adminUsername, email: adminUserEmail, password: adminPassword }
    }, 'Institute and admin account created successfully');
  } catch (error) {
    console.error('Create institute error:', error);
    return apiError('An error occurred', 500);
  }
}
