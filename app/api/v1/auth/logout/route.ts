export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, revokeAllUserTokens, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return apiError('Not authenticated', 401);
    }

    await revokeAllUserTokens(user.id);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: `${user.role}.logout`,
      entityType: 'user',
      entityId: user.id,
      request,
    });

    const response = apiSuccess({}, 'Logged out successfully');
    response.headers.append(
      'Set-Cookie',
      'refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return apiError('An error occurred during logout', 500);
  }
}
