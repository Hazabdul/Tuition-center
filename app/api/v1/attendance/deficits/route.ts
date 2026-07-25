export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    // Fetch all attendance records
    const { data: records } = await supabase
      .from('attendance')
      .select('student_id, status, student:students(id, first_name, last_name, student_id)')
      .eq('institute_id', instituteId);

    const studentMap = new Map<string, { student: any; total: number; present: number }>();

    (records || []).forEach((r) => {
      const sId = r.student_id;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, { student: r.student, total: 0, present: 0 });
      }
      const item = studentMap.get(sId)!;
      item.total++;
      if (r.status === 'present' || r.status === 'late') {
        item.present++;
      }
    });

    const deficitStudents: any[] = [];
    studentMap.forEach((val) => {
      const percentage = val.total > 0 ? Math.round((val.present / val.total) * 100) : 100;
      if (percentage < 75) {
        deficitStudents.push({
          studentId: val.student?.id,
          studentCode: val.student?.student_id,
          studentName: `${val.student?.first_name} ${val.student?.last_name}`,
          totalClasses: val.total,
          attendedClasses: val.present,
          percentage: percentage,
        });
      }
    });

    return apiSuccess(deficitStudents, 'Low attendance deficit students fetched');
  } catch (error) {
    console.error('Attendance deficits error:', error);
    return apiError('Failed to fetch attendance deficits', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { studentId, studentName, percentage } = body;

    // Fetch linked parent
    const { data: links } = await supabase
      .from('parent_student')
      .select('parent:parents(user_id)')
      .eq('student_id', studentId);

    let sentCount = 0;
    for (const l of links || []) {
      const parentUserId = (l.parent as any)?.user_id;
      if (parentUserId) {
        await supabase.from('notifications').insert({
          institute_id: instituteId,
          user_id: parentUserId,
          title: '⚠️ Low Attendance Warning Notice',
          message: `Attendance alert for ${studentName}: Current attendance is ${percentage}% (Below 75% required threshold). Please contact the institute admin.`,
          type: 'urgent',
          is_read: false,
        });
        sentCount++;
      }
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'attendance.send_warning',
      entityType: 'attendance',
      entityId: studentId,
      newValues: { studentName, percentage },
      request,
    });

    return apiSuccess({ sentCount }, `Attendance warning notice sent to parent!`);
  } catch (error) {
    console.error('Send attendance warning error:', error);
    return apiError('Failed to send attendance warning', 500);
  }
}
