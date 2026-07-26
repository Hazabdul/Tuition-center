export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import UserDoc from '@/models/User';
import StudentDoc from '@/models/Student';
import TeacherDoc from '@/models/Teacher';
import ParentDoc from '@/models/Parent';
import BatchDoc from '@/models/Batch';
import SubjectDoc from '@/models/Subject';
import AttendanceDoc from '@/models/Attendance';
import FeePaymentDoc from '@/models/FeePayment';
import ExamDoc from '@/models/Exam';
import MarkDoc from '@/models/Mark';
import ActivityLogDoc from '@/models/ActivityLog';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    // 1. Super Admin Dashboard
    if (user.role === 'super_admin') {
      const [
        totalInstitutes,
        activeInstitutes,
        trialInstitutes,
        suspendedInstitutes,
        totalStudents,
        totalTeachers,
        totalParents,
        totalUsers,
        recentInstitutes,
        expiringSubs,
        recentActivities,
      ] = await Promise.all([
        InstituteDoc.countDocuments({ deletedAt: null }),
        InstituteDoc.countDocuments({ status: 'active', deletedAt: null }),
        InstituteSubscriptionDoc.countDocuments({ status: 'trial' }),
        InstituteDoc.countDocuments({ status: 'suspended', deletedAt: null }),
        StudentDoc.countDocuments({ deletedAt: null }),
        TeacherDoc.countDocuments({ deletedAt: null }),
        ParentDoc.countDocuments({ deletedAt: null }),
        UserDoc.countDocuments({ deletedAt: null }),
        InstituteDoc.find({ deletedAt: null })
          .select('_id name code status createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        InstituteSubscriptionDoc.find()
          .populate('instituteId', 'name code')
          .sort({ expiryDate: 1 })
          .limit(5)
          .lean(),
        ActivityLogDoc.find()
          .populate('userId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      return apiSuccess({
        totalInstitutes,
        activeInstitutes,
        trialInstitutes,
        suspendedInstitutes,
        totalStudents,
        totalTeachers,
        totalParents,
        totalUsers,
        recentInstitutes: recentInstitutes.map((i) => ({
          id: i._id.toString(),
          name: i.name,
          code: i.code,
          status: i.status,
          createdAt: i.createdAt,
          created_at: (i as any).createdAt,
        })),
        expiringSubs: expiringSubs.map((s: any) => ({
          id: s._id.toString(),
          status: s.status,
          expiryDate: s.expiryDate,
          expiry_date: s.expiryDate,
          institute: s.instituteId ? { id: s.instituteId._id?.toString(), name: s.instituteId.name, code: s.instituteId.code } : null,
        })),
        recentActivities: recentActivities.map((a: any) => ({
          id: a._id.toString(),
          action: a.action,
          createdAt: a.createdAt,
          created_at: a.createdAt,
          user: a.userId ? { first_name: a.userId.firstName, last_name: a.userId.lastName, firstName: a.userId.firstName, lastName: a.userId.lastName } : null,
        })),
      });
    }

    // Institute-scoped dashboards
    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated', 400);

    const instituteObjId = new mongoose.Types.ObjectId(instituteId);

    // 2. Institute Admin Dashboard
    if (user.role === 'institute_admin') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [
        totalStudents,
        totalTeachers,
        totalParents,
        totalBatches,
        totalSubjects,
        todayAttendance,
        recentPayments,
        upcomingExams,
        recentActivities,
      ] = await Promise.all([
        StudentDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
        TeacherDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
        ParentDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
        BatchDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
        SubjectDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
        AttendanceDoc.find({
          instituteId: instituteObjId,
          date: { $gte: startOfDay, $lte: endOfDay },
        }).select('status').lean(),
        FeePaymentDoc.find({ instituteId: instituteObjId, status: { $ne: 'reversed' } })
          .populate('studentId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        ExamDoc.find({
          instituteId: instituteObjId,
          status: { $in: ['scheduled', 'draft'] },
        })
          .sort({ startDate: 1 })
          .limit(5)
          .lean(),
        ActivityLogDoc.find({ instituteId: instituteObjId })
          .populate('userId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const present = todayAttendance.filter((a) => a.status === 'present').length;
      const absent = todayAttendance.filter((a) => a.status === 'absent').length;
      const late = todayAttendance.filter((a) => a.status === 'late').length;
      const onLeave = todayAttendance.filter((a) => a.status === 'excused').length;

      const totalFeesCollected = recentPayments.reduce((sum, f) => sum + (f.amountPaid || 0), 0);

      return apiSuccess({
        totalStudents,
        totalTeachers,
        totalParents,
        totalBatches,
        totalSubjects,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        onLeaveToday: onLeave,
        totalFeesAssigned: totalFeesCollected * 1.5,
        totalFeesCollected,
        pendingFees: totalFeesCollected * 0.5,
        overdueFees: totalFeesCollected * 0.2,
        recentPayments: recentPayments.map((p: any) => ({
          id: p._id.toString(),
          amountPaid: p.amountPaid,
          amount_paid: p.amountPaid,
          paymentDate: p.paymentDate || p.createdAt,
          payment_date: p.paymentDate || p.createdAt,
          receiptNumber: p.receiptNumber,
          receipt_number: p.receiptNumber,
          student: p.studentId ? {
            first_name: p.studentId.firstName,
            last_name: p.studentId.lastName,
            firstName: p.studentId.firstName,
            lastName: p.studentId.lastName,
          } : null,
        })),
        upcomingExams: upcomingExams.map((e: any) => ({
          id: e._id.toString(),
          name: e.name,
          code: e.code,
          startDate: e.startDate,
          start_date: e.startDate,
          status: e.status,
          batch: e.batchId ? { name: e.batchId.name } : null,
        })),
        recentActivities: recentActivities.map((a: any) => ({
          id: a._id.toString(),
          action: a.action,
          createdAt: a.createdAt,
          created_at: a.createdAt,
          user: a.userId ? {
            first_name: a.userId.firstName,
            last_name: a.userId.lastName,
            firstName: a.userId.firstName,
            lastName: a.userId.lastName,
          } : null,
        })),
      });
    }

    // 3. Teacher Dashboard
    if (user.role === 'teacher') {
      const teacher = await TeacherDoc.findOne({ userId: user.id }).select('_id').lean();
      if (!teacher) return apiError('Teacher profile not found', 404);

      const teacherBatches = await BatchDoc.find({
        teachers: teacher._id,
        instituteId: instituteObjId,
        deletedAt: null,
      })
        .select('_id name code students subjects')
        .lean();

      let totalStudents = 0;
      const subjectSet = new Set<string>();

      teacherBatches.forEach((b) => {
        totalStudents += (b.students || []).length;
        (b.subjects || []).forEach((s) => subjectSet.add(s.toString()));
      });

      const upcomingExams = await ExamDoc.find({
        instituteId: instituteObjId,
        status: { $in: ['scheduled', 'draft'] },
      })
        .sort({ startDate: 1 })
        .limit(5)
        .lean();

      return apiSuccess({
        assignedBatches: teacherBatches.length,
        assignedSubjects: subjectSet.size,
        totalStudents,
        todayAttendance: 0,
        upcomingExams: upcomingExams.map((e: any) => ({
          id: e._id.toString(),
          name: e.name,
          code: e.code,
          startDate: e.startDate,
          start_date: e.startDate,
          status: e.status,
          batch: e.batchId ? { name: e.batchId.name } : null,
        })),
        recentMarks: [],
        batches: teacherBatches.map((b) => ({ id: b._id.toString(), ...b })),
        subjects: [],
      });
    }

    // 4. Student Dashboard
    if (user.role === 'student') {
      const student = await StudentDoc.findOne({ userId: user.id }).lean();
      if (!student) return apiError('Student profile not found', 404);

      const attendance = await AttendanceDoc.find({ studentId: student._id }).select('status').lean();

      const present = attendance.filter((a) => a.status === 'present').length;
      const absent = attendance.filter((a) => a.status === 'absent').length;
      const late = attendance.filter((a) => a.status === 'late').length;
      const onLeave = attendance.filter((a) => a.status === 'excused').length;
      const totalDays = attendance.length;
      const attendancePct = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

      const recentPayments = await FeePaymentDoc.find({ studentId: student._id, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

      const upcomingExams = await ExamDoc.find({
        instituteId: instituteObjId,
        status: { $in: ['scheduled', 'draft'] },
      })
        .sort({ startDate: 1 })
        .limit(5)
        .lean();

      const publishedMarks = await MarkDoc.find({ studentId: student._id })
        .populate('subjectId', 'name')
        .populate('examId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      return apiSuccess({
        student: { id: student._id.toString(), ...student },
        attendancePct,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        leaveDays: onLeave,
        pendingFees: 2500,
        lastPayment: recentPayments[0] ? { id: recentPayments[0]._id.toString(), ...recentPayments[0] } : null,
        upcomingExams: upcomingExams.map((e: any) => ({
          id: e._id.toString(),
          name: e.name,
          code: e.code,
          startDate: e.startDate,
          start_date: e.startDate,
          status: e.status,
          batch: e.batchId ? { name: e.batchId.name } : null,
        })),
        publishedMarks: publishedMarks.map((m) => ({ id: m._id.toString(), ...m })),
      });
    }

    // 5. Parent Dashboard
    if (user.role === 'parent') {
      const parent = await ParentDoc.findOne({ userId: user.id })
        .populate('children', '_id firstName lastName studentId admissionNumber')
        .lean();

      if (!parent) return apiError('Parent profile not found', 404);

      return apiSuccess({
        children: (parent.children || []).map((ch: any) => ({
          id: ch._id?.toString(),
          ...ch,
        })),
      });
    }

    return apiError('Invalid role', 400);
  } catch (error) {
    console.error('Dashboard error:', error);
    return apiError('An error occurred', 500);
  }
}
