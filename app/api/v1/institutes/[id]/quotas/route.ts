export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import mongoose from 'mongoose';

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
    if (!mongoose.Types.ObjectId.isValid(id)) return apiError('Invalid institute id', 400);

    const body = await request.json();
    const { studentLimit, teacherLimit, adminLimit, extendTrialDays, status } = body;

    await dbConnect();

    const updateFields: Record<string, unknown> = {};
    if (typeof studentLimit === 'number') updateFields.studentLimit = studentLimit;
    if (typeof teacherLimit === 'number') updateFields.teacherLimit = teacherLimit;
    if (typeof adminLimit === 'number') updateFields.adminLimit = adminLimit;
    if (status) updateFields.status = status;

    const institute = await InstituteDoc.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!institute) return apiError('Failed to update institute quotas', 400);

    // Handle trial extension if requested
    if (extendTrialDays && typeof extendTrialDays === 'number') {
      const sub = await InstituteSubscriptionDoc.findOne({ instituteId: new mongoose.Types.ObjectId(id) })
        .sort({ createdAt: -1 });

      if (sub && sub.expiryDate) {
        const newExpiry = new Date(sub.expiryDate);
        newExpiry.setDate(newExpiry.getDate() + extendTrialDays);
        await InstituteSubscriptionDoc.findByIdAndUpdate(sub._id, {
          $set: { expiryDate: newExpiry },
        });
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

    return apiSuccess({ id: institute._id.toString(), ...institute }, 'Institute quotas updated successfully');
  } catch (error) {
    console.error('Quotas update error:', error);
    return apiError('Failed to update quotas', 500);
  }
}
