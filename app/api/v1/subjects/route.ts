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

    let selectFields = 'id, name, code, description, syllabus, max_marks, passing_marks, is_active, created_at';
    let query = supabase
      .from('subjects')
      .select(selectFields, { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    let data: any[] | null = null;
    let count: number | null = 0;
    let error: any = null;

    const res = await query;
    data = res.data as any[] | null;
    count = res.count;
    error = res.error;

    if (error && error.message.includes('syllabus')) {
      let fallbackQuery = supabase
        .from('subjects')
        .select('id, name, code, description, max_marks, passing_marks, is_active, created_at', { count: 'exact' })
        .eq('institute_id', user.instituteId)
        .is('deleted_at', null);
      if (search) fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      if (status === 'active') fallbackQuery = fallbackQuery.eq('is_active', true);
      if (status === 'inactive') fallbackQuery = fallbackQuery.eq('is_active', false);
      fallbackQuery = fallbackQuery.order(sortBy, { ascending: sortOrder === 'asc' });
      fallbackQuery = fallbackQuery.range((page - 1) * limit, page * limit - 1);
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data as any[] | null;
      count = fallbackRes.count;
      error = fallbackRes.error;
    }

    if (error) return apiError(error.message, 400);

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
    const { name, code, description, syllabus, maxMarks, passingMarks, batchIds, teacherIds, studentIds } = body;

    if (!name) return apiError('Subject name is required', 400);

    let finalCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase().trim();
    if (!finalCode) finalCode = `SUB${Math.floor(100 + Math.random() * 900)}`;

    const { data: existingCode } = await supabase
      .from('subjects')
      .select('id')
      .eq('institute_id', user.instituteId)
      .ilike('code', finalCode)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingCode) {
      if (!code) {
        finalCode = `${finalCode}${Math.floor(10 + Math.random() * 90)}`;
      } else {
        return apiError(`Subject code "${finalCode}" already exists in this institute. Please choose a unique code.`, 409);
      }
    }

    if (maxMarks !== undefined && passingMarks !== undefined && Number(passingMarks) > Number(maxMarks)) {
      return apiError('Passing marks cannot exceed max marks', 400);
    }

    const insertPayload: Record<string, unknown> = {
      institute_id: user.instituteId,
      name,
      code: finalCode,
      description,
      syllabus: syllabus || null,
      max_marks: maxMarks ? Number(maxMarks) : 100,
      passing_marks: passingMarks ? Number(passingMarks) : 40,
      is_active: true,
    };

    let { data: subject, error } = await supabase
      .from('subjects')
      .insert(insertPayload)
      .select('id, name, code')
      .single();

    if (error && error.message.includes('syllabus')) {
      delete insertPayload.syllabus;
      const fallbackInsert = await supabase
        .from('subjects')
        .insert(insertPayload)
        .select('id, name, code')
        .single();
      subject = fallbackInsert.data;
      error = fallbackInsert.error;
    }

    if (error || !subject) return apiError(error?.message || 'Failed to create subject', 400);

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
