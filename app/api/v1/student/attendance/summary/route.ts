export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    // Find student ID linked to this user
    let studentId = user.studentId;
    if (!studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      studentId = student?.id;
    }

    if (!studentId) {
      return apiSuccess({
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        leave_days: 0,
        attendance_percentage: 0,
      }, 'No student profile linked');
    }

    const { data: records } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId);

    const list = records || [];
    const present_days = list.filter(r => r.status === 'present').length;
    const absent_days = list.filter(r => r.status === 'absent').length;
    const late_days = list.filter(r => r.status === 'late').length;
    const leave_days = list.filter(r => r.status === 'leave').length;
    const total_days = list.length;
    const attendance_percentage = total_days > 0 ? Math.round((present_days / total_days) * 100) : 0;

    return apiSuccess({
      total_days,
      present_days,
      absent_days,
      late_days,
      leave_days,
      attendance_percentage,
    }, 'Student attendance summary fetched');
  } catch (error) {
    console.error('Student attendance summary error:', error);
    return apiError('An error occurred', 500);
  }
}
