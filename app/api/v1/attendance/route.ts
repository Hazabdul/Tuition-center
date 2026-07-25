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
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const batchId = searchParams.get('batchId') || '';
    const date = searchParams.get('date') || '';
    const studentId = searchParams.get('studentId') || '';
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('attendance')
      .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, updated_at, student:students(id, first_name, last_name, student_id), batch:batches(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId);

    if (batchId) query = query.eq('batch_id', batchId);
    if (date) query = query.eq('date', date);
    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`student_id.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    return apiSuccess(data || [], 'Attendance fetched', {
      page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('List attendance error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentId, batchId, date, status, remarks } = body;

    if (!studentId || !batchId || !date || !status) {
      return apiError('Student ID, batch ID, date, and status are required', 400);
    }

    const validStatuses = ['present', 'absent', 'late', 'leave'];
    if (!validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: present, absent, late, leave', 400);
    }

    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      return apiError('Date cannot be in the future', 400);
    }

    const { data: existing } = await supabase
      .from('attendance')
      .select('id, status')
      .eq('institute_id', user.instituteId)
      .eq('student_id', studentId)
      .eq('batch_id', batchId)
      .eq('date', date)
      .maybeSingle();

    if (existing) {
      return apiError('Attendance already marked for this student on this date', 409);
    }

    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        institute_id: user.instituteId,
        student_id: studentId,
        batch_id: batchId,
        date,
        status,
        remarks: remarks || null,
        marked_by: user.id,
      })
      .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError('Attendance already marked for this student on this date', 409);
      }
      return apiError(error.message, 400);
    }

    await supabase.from('attendance_audit_log').insert({
      institute_id: user.instituteId,
      attendance_id: attendance.id,
      student_id: studentId,
      batch_id: batchId,
      date,
      old_status: null,
      new_status: status,
      action: 'created',
      performed_by: user.id,
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_marked',
      entityType: 'attendance',
      entityId: attendance.id,
      newValues: { studentId, batchId, date, status, remarks },
      request,
    });

    return apiSuccess(attendance, 'Attendance marked successfully');
  } catch (error) {
    console.error('Create attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
