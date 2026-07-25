export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

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
      .from('subjects')
      .select('id, name, code, description, max_marks, passing_marks, is_active, created_at', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Subjects fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List subjects error:', error);
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
    const { name, code, description, maxMarks, passingMarks, batchIds, teacherIds, studentIds } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const { data: existingCode } = await supabase.from('subjects').select('id').eq('institute_id', user.instituteId).eq('code', code).is('deleted_at', null).maybeSingle();
    if (existingCode) return apiError('Subject code already exists in this institute', 409);

    if (maxMarks !== undefined && passingMarks !== undefined && Number(passingMarks) > Number(maxMarks)) {
      return apiError('Passing marks cannot exceed max marks', 400);
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        institute_id: user.instituteId,
        name, code, description,
        max_marks: maxMarks ? Number(maxMarks) : 100, passing_marks: passingMarks ? Number(passingMarks) : 40,
        is_active: true,
      })
      .select('id, name, code')
      .single();

    if (error) return apiError(error.message, 400);

    // Link batchIds if provided
    if (Array.isArray(batchIds) && batchIds.length > 0) {
      const batchInserts = batchIds.map((bid: string) => ({
        batch_id: bid, subject_id: subject.id, institute_id: user.instituteId,
      }));
      await supabase.from('batch_subject').insert(batchInserts);
    }

    // Link teacherIds if provided
    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      const teacherInserts = teacherIds.map((tid: string) => ({
        teacher_id: tid, subject_id: subject.id, institute_id: user.instituteId,
      }));
      await supabase.from('teacher_subject').insert(teacherInserts);
    }

    // Link studentIds if provided
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const studentInserts = studentIds.map((sid: string) => ({
        student_id: sid, subject_id: subject.id, institute_id: user.instituteId,
      }));
      await supabase.from('student_subject').insert(studentInserts);
    }

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'subject_created', entityType: 'subject', entityId: subject.id, newValues: body, request });

    return apiSuccess(subject, 'Subject created successfully');
  } catch (error) {
    console.error('Create subject error:', error);
    return apiError('An error occurred', 500);
  }
}
