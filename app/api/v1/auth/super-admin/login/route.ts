export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  supabase,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  mapDbUser,
  apiSuccess,
  apiError,
  logActivity,
} from '@/lib/auth';
import { ROLE_DASHBOARD_PATHS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Email and password are required', 400);
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!dbUser) {
      return apiError('Invalid credentials', 401);
    }

    if (!verifyPassword(password, dbUser.password_hash)) {
      return apiError('Invalid credentials', 401);
    }

    const user = mapDbUser(dbUser);
    const payload = { userId: user.id, role: user.role, instituteId: user.instituteId };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await createRefreshTokenRecord(user.id, refreshToken);

    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    await logActivity({
      instituteId: null,
      userId: user.id,
      action: 'super_admin.login',
      entityType: 'user',
      entityId: user.id,
      request,
    });

    const response = apiSuccess(
      {
        user,
        accessToken,
        refreshToken,
        redirectPath: ROLE_DASHBOARD_PATHS.super_admin,
      },
      'Login successful'
    );

    response.headers.append(
      'Set-Cookie',
      `access_token=${accessToken}; Path=/; Max-Age=900; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    console.error('Super admin login error:', error);
    return apiError('An error occurred during login', 500);
  }
}
