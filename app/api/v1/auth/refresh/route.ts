export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  verifyRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  signRefreshToken,
  mapDbUser,
  apiSuccess,
  apiError,
} from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import UserDoc from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let refreshToken = body.refreshToken;

    if (!refreshToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/refresh_token=([^;]+)/);
      refreshToken = match?.[1];
    }

    if (!refreshToken) {
      return apiError('Refresh token required', 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return apiError('Invalid or expired refresh token', 401);
    }

    await dbConnect();

    const dbUser = await UserDoc.findOne({
      _id: payload.userId,
      isActive: true,
      deletedAt: null,
    }).lean();

    if (!dbUser) {
      return apiError('User not found', 401);
    }

    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    const rotated = await rotateRefreshToken(refreshToken, newRefreshToken, payload.userId);
    if (!rotated) {
      return apiError('Token rotation failed. Please login again.', 401);
    }

    const user = mapDbUser(dbUser as unknown as Record<string, unknown>);

    const response = apiSuccess({ user, accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${newRefreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return apiError('An error occurred during token refresh', 500);
  }
}
