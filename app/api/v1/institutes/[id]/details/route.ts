export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import TeacherDoc from '@/models/Teacher';
import StudentDoc from '@/models/Student';
import BatchDoc from '@/models/Batch';
import SubjectDoc from '@/models/Subject';
import ExamDoc from '@/models/Exam';
import MarkDoc from '@/models/Mark';
import FeePaymentDoc from '@/models/FeePayment';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'super_admin') {
      return apiError('Unauthorized: Only Super Admins can access full institute details', 403);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError('Invalid institute id', 400);

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(id);

    // 1. Institute Info
    const institute = await InstituteDoc.findOne({ _id: id, deletedAt: null }).lean();
    if (!institute) return apiError('Institute not found', 404);

    // 2. Active Subscription
    const subscription = await InstituteSubscriptionDoc.findOne({ instituteId: instituteObjId, deletedAt: null })
      .populate('planId', 'name code monthlyPrice')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Teachers
    const teachers = await TeacherDoc.find({ instituteId: instituteObjId, deletedAt: null })
      .select('_id teacherId firstName lastName email phone qualification specialization joiningDate isActive')
      .lean();

    // 4. Students
    const students = await StudentDoc.find({ instituteId: instituteObjId, deletedAt: null })
      .select('_id studentId admissionNumber firstName lastName email phone gender academicYear isActive')
      .lean();

    // 5. Batches with enrolled student count
    const batches = await BatchDoc.find({ instituteId: instituteObjId, deletedAt: null })
      .select('_id name code academicYear startDate endDate maxStudents isActive students')
      .lean();

    const batchesWithCount = batches.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      code: b.code,
      academicYear: b.academicYear,
      startDate: b.startDate,
      endDate: b.endDate,
      capacity: b.maxStudents,
      isActive: b.isActive,
      enrolledCount: (b.students || []).length,
    }));

    // 6. Subjects
    const subjects = await SubjectDoc.find({ instituteId: instituteObjId, deletedAt: null })
      .select('_id name code maxMarks passingMarks isActive')
      .lean();

    // 7. Exams with pass rates
    const exams = await ExamDoc.find({ instituteId: instituteObjId })
      .select('_id name code academicYear startDate endDate status')
      .lean();

    const examsWithStats = await Promise.all(
      exams.map(async (ex) => {
        const marks = await MarkDoc.find({ examId: ex._id }).select('isPass obtainedMarks maxMarks').lean();
        const totalEntries = marks.length;
        const passEntries = marks.filter((m) => m.isPass).length;
        const passRate = totalEntries > 0 ? Math.round((passEntries / totalEntries) * 100) : 0;
        return { id: ex._id.toString(), ...ex, totalEntries, passEntries, passRate };
      })
    );

    // 8. Recent Payments
    const recentPayments = await FeePaymentDoc.find({
      instituteId: instituteObjId,
      deletedAt: null,
      status: { $ne: 'reversed' },
    })
      .select('_id receiptNumber amountPaid paymentDate paymentMode transactionId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const totalCollectedFees = recentPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

    return apiSuccess({
      institute: {
        id: institute._id.toString(),
        name: institute.name,
        code: institute.code,
        email: institute.email,
        phone: institute.phone,
        address: institute.address,
        city: institute.city,
        stateRegion: institute.stateRegion,
        status: institute.status,
        studentLimit: institute.studentLimit,
        teacherLimit: institute.teacherLimit,
        adminLimit: institute.adminLimit,
        logoUrl: institute.logoUrl,
        createdAt: institute.createdAt,
      },
      subscription: subscription ? {
        id: subscription._id.toString(),
        status: subscription.status,
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
        plan: subscription.planId,
      } : null,
      teachers: teachers.map((t) => ({ id: t._id.toString(), ...t })),
      students: students.map((s) => ({ id: s._id.toString(), ...s })),
      batches: batchesWithCount,
      subjects: subjects.map((s) => ({ id: s._id.toString(), ...s })),
      exams: examsWithStats,
      feeSummary: {
        totalCollected: totalCollectedFees,
        recentPayments: recentPayments.map((p) => ({ id: p._id.toString(), ...p })),
      },
    }, 'Institute detailed 360 view data fetched successfully');
  } catch (error) {
    console.error('Institute details 360 error:', error);
    return apiError('Failed to fetch institute details', 500);
  }
}
