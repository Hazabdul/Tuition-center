export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  supabase,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  verifyAccessToken,
  mapDbUser,
  apiSuccess,
  apiError,
  logActivity,
} from '@/lib/auth';
import { ROLE_DASHBOARD_PATHS } from '@/lib/constants';
import type { Role } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instituteCode, identifier, password } = body;

    if (!identifier || !password) {
      return apiError('Identifier and password are required', 400);
    }

    // Find institute by code
    const { data: institute } = await supabase
      .from('institutes')
      .select('id, status, deleted_at')
      .eq('code', instituteCode)
      .is('deleted_at', null)
      .single();

    if (!institute) {
      return apiError('Invalid institute code', 401);
    }

    if (institute.status === 'suspended') {
      return apiError('This institute has been suspended. Please contact support.', 403);
    }
    if (institute.status === 'inactive' || institute.status === 'deleted') {
      return apiError('This institute is not active. Please contact support.', 403);
    }

    // Check subscription
    const { data: sub } = await supabase
      .from('institute_subscriptions')
      .select('status, expiry_date')
      .eq('institute_id', institute.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sub) {
      if (sub.status === 'suspended' || sub.status === 'cancelled') {
        return apiError('Institute subscription is not active. Please contact support.', 403);
      }
      if (sub.status === 'expired' || (sub.expiry_date && new Date(sub.expiry_date) < new Date())) {
        return apiError('Institute subscription has expired. Please renew to continue.', 403);
      }
    }

    // Find user by identifier (email, username, phone, or student_id) within institute
    let userQuery = supabase
      .from('users')
      .select('*')
      .eq('institute_id', institute.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('role', 'super_admin');

    // Try matching by email, username, phone, or student_id
    const { data: users } = await userQuery.or(
      `email.eq.${identifier},username.eq.${identifier},phone.eq.${identifier},student_id.eq.${identifier}`
    );

    if (!users || users.length === 0) {
      return apiError('Invalid credentials', 401);
    }

    const dbUser = users[0];
    if (!verifyPassword(password, dbUser.password_hash)) {
      return apiError('Invalid credentials', 401);
    }

    const user = mapDbUser(dbUser);
    const payload = { userId: user.id, role: user.role, instituteId: user.instituteId };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await createRefreshTokenRecord(user.id, refreshToken);

    // Update last login
    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: `${user.role}.login`,
      entityType: 'user',
      entityId: user.id,
      request,
    });

    const response = apiSuccess(
      {
        user,
        accessToken,
        refreshToken,
        redirectPath: ROLE_DASHBOARD_PATHS[user.role as Role],
      },
      'Login successful'
    );

    // Set tokens as cookies
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
    console.error('Login error:', error);
    return apiError('An error occurred during login', 500);
  }
}
