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
      .from('teachers')
      .select('id, employee_id, first_name, last_name, email, phone, qualification, specialization, joining_date, is_active, created_at', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Teachers fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
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

    const body = await request.json();
    const { employeeId, firstName, lastName, email, phone, altPhone, qualification, specialization, joiningDate, address, profilePhotoUrl, notes, username, password, subjectIds } = body;

    if (!employeeId || !firstName) return apiError('Employee ID and first name are required', 400);

    const { count: teacherCount } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const { data: institute } = await supabase.from('institutes').select('teacher_limit').eq('id', user.instituteId).single();
    const teacherLimit = (institute as Record<string, unknown>).teacher_limit as unknown as number;
    if (institute && teacherCount && teacherCount >= teacherLimit) {
      return apiError('Teacher limit reached for this institute', 400);
    }

    const { data: existingEmp } = await supabase.from('teachers').select('id').eq('institute_id', user.instituteId).eq('employee_id', employeeId).maybeSingle();
    if (existingEmp) return apiError('Employee ID already exists in this institute', 409);

    let userId: string | null = null;
    if (username && password) {
      const { data: existingUser } = await supabase.from('users').select('id').eq('institute_id', user.instituteId).eq('username', username).maybeSingle();
      if (existingUser) return apiError('Username already exists', 409);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          institute_id: user.instituteId,
          role: 'teacher',
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

    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({
        institute_id: user.instituteId,
        user_id: userId,
        employee_id: employeeId,
        first_name: firstName, last_name: lastName,
        email, phone, alt_phone: altPhone,
        qualification, specialization,
        joining_date: joiningDate || new Date().toISOString().split('T')[0],
        address, profile_photo_url: profilePhotoUrl,
        notes, is_active: true,
      })
      .select('id, employee_id, first_name, last_name')
      .single();

    if (error) return apiError(error.message, 400);

    // Insert linked subjects if subjectIds provided
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      const teacherSubjectInserts = subjectIds.map((sid: string) => ({
        teacher_id: teacher.id,
        subject_id: sid,
        institute_id: user.instituteId,
      }));
      await supabase.from('teacher_subject').insert(teacherSubjectInserts);
    }

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'teacher_created', entityType: 'teacher', entityId: teacher.id, newValues: body, request });

    return apiSuccess(teacher, 'Teacher created successfully');
  } catch (error) {
    console.error('Create teacher error:', error);
    return apiError('An error occurred', 500);
  }
}
