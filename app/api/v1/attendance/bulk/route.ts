export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin', 'teacher'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const batchId = body.batchId || body.batch_id;
    const date = body.date;
    const rawRecords = body.records || body.students || [];

    if (!batchId || !date || !Array.isArray(rawRecords) || rawRecords.length === 0) {
      return apiError('Batch ID, date, and records array are required', 400);
    }

    const records = rawRecords.map((r: any) => ({
      studentId: r.studentId || r.student_id || r.id,
      status: r.status,
      remarks: r.remarks || null,
    }));

    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) {
      return apiError('Date cannot be in the future', 400);
    }

    const validStatuses = ['present', 'absent', 'late', 'leave'];
    for (const rec of records) {
      if (!rec.studentId || !rec.status) {
        return apiError('Each record must have studentId (or student_id) and status', 400);
      }
      if (!validStatuses.includes(rec.status)) {
        return apiError(`Invalid status: ${rec.status}. Must be one of: present, absent, late, leave`, 400);
      }
    }

    const { data: existingRecords } = await supabase
      .from('attendance')
      .select('id, student_id, status')
      .eq('institute_id', user.instituteId)
      .eq('batch_id', batchId)
      .eq('date', date);

    const existingMap = new Map((existingRecords || []).map(r => [r.student_id, r]));

    const auditLogs: Record<string, unknown>[] = [];
    const upsertResults: Record<string, unknown>[] = [];

    for (const rec of records) {
      const existing = existingMap.get(rec.studentId) as any;
      const oldStatus = existing?.status || null;

      if (existing) {
        const { data: updated, error } = await supabase
          .from('attendance')
          .update({
            status: rec.status,
            remarks: rec.remarks ?? null,
            marked_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, updated_at')
          .single();

        if (error) {
          console.error('Update attendance error:', error);
          continue;
        }

        upsertResults.push(updated);

        if (oldStatus !== rec.status) {
          auditLogs.push({
            institute_id: user.instituteId,
            attendance_id: existing.id,
            student_id: rec.studentId,
            batch_id: batchId,
            date,
            old_status: oldStatus,
            new_status: rec.status,
            action: 'updated',
            performed_by: user.id,
          });
        }
      } else {
        const { data: created, error } = await supabase
          .from('attendance')
          .insert({
            institute_id: user.instituteId,
            student_id: rec.studentId,
            batch_id: batchId,
            date,
            status: rec.status,
            remarks: rec.remarks ?? null,
            marked_by: user.id,
          })
          .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, updated_at')
          .single();

        if (error) {
          if (error.code === '23505') {
            continue;
          }
          console.error('Create attendance error:', error);
          continue;
        }

        upsertResults.push(created);

        auditLogs.push({
          institute_id: user.instituteId,
          attendance_id: created.id,
          student_id: rec.studentId,
          batch_id: batchId,
          date,
          old_status: null,
          new_status: rec.status,
          action: 'created',
          performed_by: user.id,
        });
      }
    }

    if (auditLogs.length > 0) {
      await supabase.from('attendance_audit_log').insert(auditLogs);
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'attendance_bulk_marked',
      entityType: 'attendance',
      newValues: { batchId, date, count: records.length },
      request,
    });

    return apiSuccess(
      { processed: upsertResults.length, total: records.length, records: upsertResults },
      `Bulk attendance processed: ${upsertResults.length} of ${records.length} records`
    );
  } catch (error) {
    console.error('Bulk attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
