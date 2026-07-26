export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { categoryId, batchId, academicYear, amount, dueDate, isActive } = body;

    if (amount !== undefined && amount < 0) return apiError('Amount must be non-negative', 400);

    await dbConnect();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_structure_updated',
      entityType: 'fee_structure',
      entityId: params.id,
      newValues: body,
      request,
    });

    return apiSuccess(
      {
        id: params.id,
        instituteId: user.instituteId,
        categoryId: categoryId || 'cat_tuition',
        batchId: batchId || null,
        academicYear: academicYear || null,
        amount: amount || 0,
        dueDate: dueDate || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date(),
      },
      'Fee structure updated successfully'
    );
  } catch (error) {
    console.error('Update fee structure error:', error);
    return apiError('An error occurred', 500);
  }
}
