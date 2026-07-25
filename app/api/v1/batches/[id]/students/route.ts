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
      return apiError('Unauthorized: Only Institute Admins can enroll students into batches', 403);
    }

    const batchId = params.id;
    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) return apiError('Student ID is required', 400);

    // Check existing enrollment
    const { data: existing } = await supabase
      .from('student_batch')
      .select('id')
      .eq('batch_id', batchId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      return apiError('Student is already enrolled in this batch', 400);
    }

    // Insert enrollment
    const { error: insertErr } = await supabase.from('student_batch').insert({
      institute_id: instituteId,
      batch_id: batchId,
      student_id: studentId,
    });

    if (insertErr) {
      console.error('Insert enrollment error:', insertErr);
      return apiError(insertErr.message, 400);
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'batch.enroll_student',
      entityType: 'student_batch',
      newValues: { batchId, studentId },
      request,
    });

    return apiSuccess({ success: true }, 'Student enrolled into batch successfully!');
  } catch (error) {
    console.error('Enroll student error:', error);
    return apiError('Failed to enroll student into batch', 500);
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
    const studentId = searchParams.get('studentId');

    if (!studentId) return apiError('Student ID is required', 400);

    await supabase
      .from('student_batch')
      .delete()
      .eq('batch_id', batchId)
      .eq('student_id', studentId);

    return apiSuccess({ success: true }, 'Student unenrolled from batch');
  } catch (error) {
    console.error('Unenroll student error:', error);
    return apiError('Failed to unenroll student from batch', 500);
  }
}
