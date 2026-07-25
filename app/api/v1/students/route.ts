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
    const batchId = searchParams.get('batchId') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('students')
      .select('id, student_id, admission_number, first_name, last_name, email, phone, gender, admission_date, academic_year, is_active, created_at, batches:student_batch(batch:batches(id, name, code))', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id.ilike.%${search}%,admission_number.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    let filteredData = data || [];
    if (batchId) {
      const { data: batchStudents } = await supabase
        .from('student_batch')
        .select('student_id')
        .eq('batch_id', batchId);
      const studentIds = new Set(batchStudents?.map(bs => bs.student_id) || []);
      filteredData = filteredData.filter(s => studentIds.has(s.id));
    }

    return apiSuccess(filteredData, 'Students fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List students error:', error);
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
    const { studentId, admissionNumber, firstName, lastName, dateOfBirth, gender, email, phone, altPhone, address, admissionDate, academicYear, batchId, emergencyContactName, emergencyContactPhone, notes, username, password } = body;

    if (!studentId || !admissionNumber || !firstName) return apiError('Student ID, admission number, and first name are required', 400);

    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const { data: institute } = await supabase.from('institutes').select('student_limit').eq('id', user.instituteId).maybeSingle();
    const studentLimit = (institute as Record<string, unknown> | null)?.student_limit as number | undefined;
    if (studentLimit !== undefined && studentCount && studentCount >= studentLimit) {
      return apiError('Student limit reached for this institute', 400);
    }

    const { data: existingSid } = await supabase.from('students').select('id').eq('institute_id', user.instituteId).eq('student_id', studentId).maybeSingle();
    if (existingSid) return apiError('Student ID already exists in this institute', 409);

    const { data: existingAdm } = await supabase.from('students').select('id').eq('institute_id', user.instituteId).eq('admission_number', admissionNumber).maybeSingle();
    if (existingAdm) return apiError('Admission number already exists in this institute', 409);

    let userId: string | null = null;
    if (username && password) {
      const { data: existingUser } = await supabase.from('users').select('id').eq('institute_id', user.instituteId).eq('username', username).maybeSingle();
      if (existingUser) return apiError('Username already exists', 409);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          institute_id: user.instituteId,
          role: 'student',
          username, email, phone, student_id: studentId,
          password_hash: hashPassword(password),
          first_name: firstName, last_name: lastName,
          is_active: true,
        })
        .select('id')
        .single();
      if (userError) return apiError(userError.message, 400);
      userId = newUser.id;
    }

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        institute_id: user.instituteId,
        user_id: userId,
        student_id: studentId,
        admission_number: admissionNumber,
        first_name: firstName, last_name: lastName,
        date_of_birth: dateOfBirth, gender, email, phone, alt_phone: altPhone,
        address, admission_date: admissionDate || new Date().toISOString().split('T')[0],
        academic_year: academicYear,
        emergency_contact_name: emergencyContactName, emergency_contact_phone: emergencyContactPhone,
        notes, is_active: true,
      })
      .select('id, student_id, first_name, last_name')
      .single();

    if (error) return apiError(error.message, 400);

    if (batchId) {
      await supabase.from('student_batch').insert({ student_id: student.id, batch_id: batchId, institute_id: user.instituteId });
    }

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_created', entityType: 'student', entityId: student.id, newValues: body, request });

    return apiSuccess(student, 'Student created successfully');
  } catch (error) {
    console.error('Create student error:', error);
    return apiError('An error occurred', 500);
  }
}
