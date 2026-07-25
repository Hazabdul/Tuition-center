export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, verifyPassword, hashPassword, apiSuccess, apiError, logActivity } from '@/lib/auth';

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

    const { data: dbUser } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (!dbUser || !verifyPassword(currentPassword, dbUser.password_hash)) {
      return apiError('Current password is incorrect', 400);
    }

    const newHash = hashPassword(newPassword);
    await supabase.from('users').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', user.id);

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
