export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    if (user.role === 'super_admin') {
      const { count: totalInstitutes } = await supabase
        .from('institutes')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: activeInstitutes } = await supabase
        .from('institutes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null);

      const { count: trialInstitutes } = await supabase
        .from('institute_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trial');

      const { count: suspendedInstitutes } = await supabase
        .from('institutes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'suspended')
        .is('deleted_at', null);

      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: totalTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: totalParents } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { data: recentInstitutes } = await supabase
        .from('institutes')
        .select('id, name, code, status, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: expiringSubs } = await supabase
        .from('institute_subscriptions')
        .select('id, status, expiry_date, institute:institutes(name, code)')
        .order('expiry_date', { ascending: true })
        .limit(5);

      const { data: recentActivities } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, user:users(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      return apiSuccess({
        totalInstitutes: totalInstitutes || 0,
        activeInstitutes: activeInstitutes || 0,
        trialInstitutes: trialInstitutes || 0,
        suspendedInstitutes: suspendedInstitutes || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalParents: totalParents || 0,
        totalUsers: totalUsers || 0,
        recentInstitutes: recentInstitutes || [],
        expiringSubs: expiringSubs || [],
        recentActivities: recentActivities || [],
      });
    }

    // Institute-scoped dashboards
    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated', 400);

    if (user.role === 'institute_admin') {
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', instituteId)
        .is('deleted_at', null);

      const { count: totalTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', instituteId)
        .is('deleted_at', null);

      const { count: totalParents } = await supabase
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', instituteId)
        .is('deleted_at', null);

      const { count: totalBatches } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', instituteId)
        .is('deleted_at', null);

      const { count: totalSubjects } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', instituteId)
        .is('deleted_at', null);

      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('institute_id', instituteId)
        .eq('date', today);

      const present = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const absent = todayAttendance?.filter(a => a.status === 'absent').length || 0;
      const late = todayAttendance?.filter(a => a.status === 'late').length || 0;
      const onLeave = todayAttendance?.filter(a => a.status === 'leave').length || 0;

      // Fees
      const { data: allFees } = await supabase
        .from('student_fees')
        .select('total_amount, paid_amount, balance_amount, status')
        .eq('institute_id', instituteId);

      const totalFeesAssigned = allFees?.reduce((sum, f) => sum + Number(f.total_amount), 0) || 0;
      const totalFeesCollected = allFees?.reduce((sum, f) => sum + Number(f.paid_amount), 0) || 0;
      const pendingFees = allFees?.reduce((sum, f) => sum + Number(f.balance_amount), 0) || 0;
      const overdueFees = allFees?.filter(f => f.status === 'overdue').reduce((sum, f) => sum + Number(f.balance_amount), 0) || 0;

      const { data: recentPayments } = await supabase
        .from('fee_payments')
        .select('id, amount_paid, payment_date, receipt_number, student:students(first_name, last_name)')
        .eq('institute_id', instituteId)
        .eq('is_reversed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: upcomingExams } = await supabase
        .from('exams')
        .select('id, name, code, start_date, end_date, status, batch:batches(name)')
        .eq('institute_id', instituteId)
        .in('status', ['scheduled', 'draft'])
        .order('start_date', { ascending: true })
        .limit(5);

      const { data: recentActivities } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, user:users(first_name, last_name)')
        .eq('institute_id', instituteId)
        .order('created_at', { ascending: false })
        .limit(5);

      return apiSuccess({
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalParents: totalParents || 0,
        totalBatches: totalBatches || 0,
        totalSubjects: totalSubjects || 0,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        onLeaveToday: onLeave,
        totalFeesAssigned,
        totalFeesCollected,
        pendingFees,
        overdueFees,
        recentPayments: recentPayments || [],
        upcomingExams: upcomingExams || [],
        recentActivities: recentActivities || [],
      });
    }

    if (user.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacher) return apiError('Teacher profile not found', 404);

      const { data: teacherBatches } = await supabase
        .from('teacher_batch')
        .select('batch_id, batch:batches(id, name, code)')
        .eq('teacher_id', teacher.id);

      const { data: teacherSubjects } = await supabase
        .from('teacher_subject')
        .select('subject_id, subject:subjects(id, name, code)')
        .eq('teacher_id', teacher.id);

      const batchIds = teacherBatches?.map(tb => tb.batch_id) || [];
      let totalStudents = 0;
      for (const bid of batchIds) {
        const { count } = await supabase
          .from('student_batch')
          .select('*', { count: 'exact', head: true })
          .eq('batch_id', bid);
        totalStudents += count || 0;
      }

      const { data: upcomingExams } = await supabase
        .from('exams')
        .select('id, name, code, start_date, status, batch:batches(name)')
        .eq('institute_id', instituteId)
        .in('batch_id', batchIds)
        .in('status', ['scheduled', 'draft'])
        .order('start_date', { ascending: true })
        .limit(5);

      const { data: recentMarks } = await supabase
        .from('marks')
        .select('id, obtained_marks, subject:subjects(name), student:students(first_name, last_name)')
        .eq('entered_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const today = new Date().toISOString().split('T')[0];
      const { data: todayAtt } = await supabase
        .from('attendance')
        .select('status')
        .eq('marked_by', user.id)
        .eq('date', today);

      return apiSuccess({
        assignedBatches: teacherBatches?.length || 0,
        assignedSubjects: teacherSubjects?.length || 0,
        totalStudents,
        todayAttendance: todayAtt?.length || 0,
        upcomingExams: upcomingExams || [],
        recentMarks: recentMarks || [],
        batches: teacherBatches || [],
        subjects: teacherSubjects || [],
      });
    }

    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!student) return apiError('Student profile not found', 404);

      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', student.id);

      const present = attendance?.filter(a => a.status === 'present').length || 0;
      const absent = attendance?.filter(a => a.status === 'absent').length || 0;
      const late = attendance?.filter(a => a.status === 'late').length || 0;
      const onLeave = attendance?.filter(a => a.status === 'leave').length || 0;
      const totalDays = attendance?.length || 0;
      const attendancePct = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

      const { data: fees } = await supabase
        .from('student_fees')
        .select('total_amount, paid_amount, balance_amount, status')
        .eq('student_id', student.id);

      const pendingFees = fees?.reduce((sum, f) => sum + Number(f.balance_amount), 0) || 0;

      const { data: recentPayments } = await supabase
        .from('fee_payments')
        .select('id, amount_paid, payment_date, receipt_number')
        .eq('student_id', student.id)
        .eq('is_reversed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: upcomingExams } = await supabase
        .from('exams')
        .select('id, name, code, start_date, end_date')
        .eq('institute_id', instituteId)
        .in('status', ['scheduled', 'draft'])
        .order('start_date', { ascending: true })
        .limit(5);

      const { data: publishedMarks } = await supabase
        .from('marks')
        .select('id, obtained_marks, grade, percentage, subject:subjects(name), exam:exams(name)')
        .eq('student_id', student.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      return apiSuccess({
        student,
        attendancePct,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        leaveDays: onLeave,
        pendingFees,
        lastPayment: recentPayments?.[0] || null,
        upcomingExams: upcomingExams || [],
        publishedMarks: publishedMarks || [],
      });
    }

    if (user.role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!parent) return apiError('Parent profile not found', 404);

      const { data: children } = await supabase
        .from('parent_student')
        .select('student:students(id, student_id, first_name, last_name)')
        .eq('parent_id', parent.id);

      return apiSuccess({
        children: children?.map(c => c.student) || [],
      });
    }

    return apiError('Invalid role', 400);
  } catch (error) {
    console.error('Dashboard error:', error);
    return apiError('An error occurred', 500);
  }
}
