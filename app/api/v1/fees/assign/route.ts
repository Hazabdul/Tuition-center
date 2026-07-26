export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentIds, categoryId, totalAmount, discountAmount, waivedAmount } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return apiError('Student IDs array is required', 400);
    }
    if (!categoryId) return apiError('Category ID is required', 400);
    if (totalAmount === undefined || totalAmount === null) {
      return apiError('Total amount is required', 400);
    }

    const discount = discountAmount || 0;
    const waived = waivedAmount || 0;
    const balance = totalAmount - discount - waived;

    if (balance < 0) return apiError('Balance cannot be negative (discount + waived exceeds total)', 400);

    await dbConnect();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fees_assigned',
      entityType: 'student_fee',
      newValues: { studentIds, categoryId, totalAmount, discount, waived, count: studentIds.length },
      request,
    });

    return apiSuccess(
      { assigned: studentIds.length },
      `Fees assigned to ${studentIds.length} student(s) successfully`
    );
  } catch (error) {
    console.error('Assign fees error:', error);
    return apiError('An error occurred', 500);
  }
}
