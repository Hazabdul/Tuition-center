export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, verifyPassword, hashPassword, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import UserDoc from '@/models/User';

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return apiError('Not authenticated', 401);
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return apiError('New password must be at least 6 characters', 400);
    }

    await dbConnect();

    const dbUser = await UserDoc.findById(user.id).select('passwordHash').lean();

    if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
      return apiError('Current password is incorrect', 400);
    }

    const newHash = hashPassword(newPassword);
    await UserDoc.findByIdAndUpdate(user.id, { $set: { passwordHash: newHash } });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: `${user.role}.change_password`,
      entityType: 'user',
      entityId: user.id,
      request,
    });

    return apiSuccess({}, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    return apiError('An error occurred', 500);
  }
}
