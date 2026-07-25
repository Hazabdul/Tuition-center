export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    // Fetch student_fees with pending or overdue balance
    const { data: pendingFees } = await supabase
      .from('student_fees')
      .select('id, student_id, balance_amount, due_date, student:students(first_name, last_name, user_id)')
      .eq('institute_id', instituteId)
      .gt('balance_amount', 0);

    let remindersCount = 0;

    for (const fee of pendingFees || []) {
      // Find parent for student
      const { data: links } = await supabase
        .from('parent_student')
        .select('parent:parents(user_id)')
        .eq('student_id', fee.student_id);

      for (const l of links || []) {
        const parentUserId = (l.parent as any)?.user_id;
        if (parentUserId) {
          const studentName = `${(fee.student as any)?.first_name} ${(fee.student as any)?.last_name}`;
          await supabase.from('notifications').insert({
            institute_id: instituteId,
            user_id: parentUserId,
            title: '💳 Fee Payment Due Reminder',
            message: `Fee balance of ₹${fee.balance_amount.toLocaleString()} for ${studentName} is due by ${fee.due_date}. Please pay promptly.`,
            type: 'warning',
            is_read: false,
          });
          remindersCount++;
        }
      }
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'fees.send_reminders',
      entityType: 'fee',
      newValues: { remindersCount },
      request,
    });

    return apiSuccess({ remindersCount }, `Fee payment reminders sent to ${remindersCount} parents!`);
  } catch (error) {
    console.error('Fee reminders error:', error);
    return apiError('Failed to send fee reminders', 500);
  }
}
