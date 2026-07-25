export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  supabase,
  getUserFromRequest,
  apiSuccess,
  apiError,
  logActivity,
} from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'super_admin') {
      return apiError('Unauthorized: Only Super Admins can modify institute quotas', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { studentLimit, teacherLimit, adminLimit, extendTrialDays, status } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof studentLimit === 'number') updateData.student_limit = studentLimit;
    if (typeof teacherLimit === 'number') updateData.teacher_limit = teacherLimit;
    if (typeof adminLimit === 'number') updateData.admin_limit = adminLimit;
    if (status) updateData.status = status;

    const { data: institute, error: instErr } = await supabase
      .from('institutes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (instErr || !institute) {
      return apiError('Failed to update institute quotas', 400);
    }

    // Handle trial extension if requested
    if (extendTrialDays && typeof extendTrialDays === 'number') {
      const { data: sub } = await supabase
        .from('institute_subscriptions')
        .select('*')
        .eq('institute_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sub) {
        const curExp = sub.expiry_date ? new Date(sub.expiry_date) : new Date();
        curExp.setDate(curExp.getDate() + extendTrialDays);
        await supabase
          .from('institute_subscriptions')
          .update({
            expiry_date: curExp.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);
      }
    }

    await logActivity({
      instituteId: id,
      userId: user.id,
      action: 'super_admin.update_quotas',
      entityType: 'institute',
      entityId: id,
      newValues: body,
      request,
    });

    return apiSuccess(institute, 'Institute quotas updated successfully');
  } catch (error) {
    console.error('Quotas update error:', error);
    return apiError('Failed to update quotas', 500);
  }
}
