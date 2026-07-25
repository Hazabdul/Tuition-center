export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  supabase,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  mapDbUser,
  apiSuccess,
  apiError,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Find super admin user
    const { data: superAdminDb } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!superAdminDb) {
      return apiError('Super Admin user not found', 404);
    }

    const superAdminUser = mapDbUser(superAdminDb);

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
