export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can assign teachers to batches', 403);
    }

    const batchId = params.id;
    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { teacherId } = body;

    if (!teacherId) return apiError('Teacher ID is required', 400);

    // Check existing assignment
    const { data: existing } = await supabase
      .from('teacher_batch')
      .select('id')
      .eq('batch_id', batchId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (existing) {
      return apiError('Teacher is already assigned to this batch', 400);
    }

    // Insert assignment
    const { error: insertErr } = await supabase.from('teacher_batch').insert({
      institute_id: instituteId,
      batch_id: batchId,
      teacher_id: teacherId,
    });

    if (insertErr) {
      console.error('Insert teacher assignment error:', insertErr);
      return apiError(insertErr.message, 400);
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'batch.assign_teacher',
      entityType: 'teacher_batch',
      newValues: { batchId, teacherId },
      request,
    });

    return apiSuccess({ success: true }, 'Teacher assigned to batch successfully!');
  } catch (error) {
    console.error('Assign teacher error:', error);
    return apiError('Failed to assign teacher to batch', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const batchId = params.id;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) return apiError('Teacher ID is required', 400);

    await supabase
      .from('teacher_batch')
      .delete()
      .eq('batch_id', batchId)
      .eq('teacher_id', teacherId);

    return apiSuccess({ success: true }, 'Teacher unassigned from batch');
  } catch (error) {
    console.error('Unassign teacher error:', error);
    return apiError('Failed to unassign teacher from batch', 500);
  }
}
