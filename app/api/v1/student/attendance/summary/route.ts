export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import AttendanceDoc from '@/models/Attendance';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);

    await dbConnect();

    let studentObjId: mongoose.Types.ObjectId | null = null;
    if (user.studentId && mongoose.Types.ObjectId.isValid(user.studentId)) {
      studentObjId = new mongoose.Types.ObjectId(user.studentId);
    } else {
      const student = await StudentDoc.findOne({ userId: user.id }).select('_id').lean();
      if (student) studentObjId = student._id as mongoose.Types.ObjectId;
    }

    if (!studentObjId) {
      return apiSuccess({
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        leave_days: 0,
        attendance_percentage: 0,
      }, 'No student profile linked');
    }

    const records = await AttendanceDoc.find({ studentId: studentObjId }).select('status').lean();

    const present_days = records.filter((r) => r.status === 'present').length;
    const absent_days = records.filter((r) => r.status === 'absent').length;
    const late_days = records.filter((r) => r.status === 'late').length;
    const leave_days = records.filter((r) => r.status === 'excused').length;
    const total_days = records.length;
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
