export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  mapDbUser,
  apiSuccess,
  apiError,
} from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import UserDoc from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const superAdminDb = await UserDoc.findOne({
      role: 'super_admin',
      isActive: true,
      deletedAt: null,
    }).lean();

    if (!superAdminDb) {
      return apiError('Super Admin user not found', 404);
    }

    const superAdminUser = mapDbUser(superAdminDb as unknown as Record<string, unknown>);

    const payload = {
      userId: superAdminUser.id,
      role: superAdminUser.role,
      instituteId: null,
    };

    const accessToken = signAccessToken(payload as any);
    const refreshToken = signRefreshToken(payload as any);
    await createRefreshTokenRecord(superAdminUser.id, refreshToken);

    const response = apiSuccess(
      {
        user: superAdminUser,
        accessToken,
        refreshToken,
        redirectPath: '/super-admin/institutes',
      },
      'Exited impersonation mode successfully'
    );

    response.headers.append(
      'Set-Cookie',
      `access_token=${accessToken}; Path=/; Max-Age=900; SameSite=Lax`
    );
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
    );
    response.headers.append(
      'Set-Cookie',
      `is_impersonating=; Path=/; Max-Age=0; SameSite=Lax`
    );
    response.headers.append(
      'Set-Cookie',
      `impersonated_institute_name=; Path=/; Max-Age=0; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error('Exit impersonation error:', error);
    return apiError('Failed to exit impersonation mode', 500);
  }
}
