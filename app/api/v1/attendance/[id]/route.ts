export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { status, remarks } = body;

    const validStatuses = ['present', 'absent', 'late', 'leave'];
    if (status && !validStatuses.includes(status)) {
      return apiError('Invalid status. Must be one of: present, absent, late, leave', 400);
    }

    const { data: existing } = await supabase
      .from('attendance')
      .select('id, student_id, batch_id, date, status, remarks')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .maybeSingle();

    if (!existing) return apiError('Attendance record not found', 404);

    const oldStatus = existing.status;
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const { data: attendance, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', params.id)
      .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, updated_at')
      .single();

    if (error) return apiError(error.message, 400);

    if (status && status !== oldStatus) {
      await supabase.from('attendance_audit_log').insert({
        institute_id: user.instituteId,
        attendance_id: params.id,
        student_id: existing.student_id,
        batch_id: existing.batch_id,
        date: existing.date,
        old_status: oldStatus,
        new_status: status,
        action: 'updated',
        performed_by: user.id,
      });
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_updated',
      entityType: 'attendance',
      entityId: params.id,
      oldValues: existing,
      newValues: body,
      request,
    });

    return apiSuccess(attendance, 'Attendance updated successfully');
  } catch (error) {
    console.error('Update attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
