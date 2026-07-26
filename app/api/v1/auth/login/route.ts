export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  mapDbUser,
  apiSuccess,
  apiError,
  logActivity,
} from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import UserDoc from '@/models/User';
import InstituteDoc from '@/models/Institute';
import { ROLE_DASHBOARD_PATHS } from '@/lib/constants';
import type { Role } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return apiError('Too many login attempts. Please try again in 15 minutes.', 429);
    }

    const body = await request.json();
    const { instituteCode, identifier, password } = body;

    if (!identifier || !password) {
      return apiError('Identifier and password are required', 400);
    }

    await dbConnect();

    // 1. Check Super Admin authentication directly
    if (
      !instituteCode ||
      instituteCode.toUpperCase() === 'SUPER' ||
      instituteCode.toUpperCase() === 'GLOBAL' ||
      identifier === 'superadmin' ||
      identifier === 'superadmin@edumanage.com'
    ) {
      const superUser = await UserDoc.findOne({
        role: 'super_admin',
        isActive: true,
        deletedAt: null,
        $or: [{ email: identifier }, { username: identifier }],
      }).lean();

      if (superUser && verifyPassword(password, superUser.passwordHash)) {
        const user = mapDbUser(superUser as unknown as Record<string, unknown>);
        const payload = { userId: user.id, role: user.role, instituteId: user.instituteId };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);
        await createRefreshTokenRecord(user.id, refreshToken);
        await UserDoc.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });

        const response = apiSuccess(
          {
            user,
            accessToken,
            refreshToken,
            redirectPath: ROLE_DASHBOARD_PATHS.super_admin,
          },
          'Super Admin login successful'
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
      }
    }

    // 2. Tenant Institute authentication
    if (!instituteCode) {
      return apiError('Institute code is required for institute users', 400);
    }

    const institute = await InstituteDoc.findOne({
      code: { $regex: new RegExp(`^${instituteCode.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      deletedAt: null,
    }).lean();

    if (!institute) {
      return apiError('Invalid institute code', 401);
    }

    if (institute.status === 'pending') {
      return apiError('Your institute account is pending activation by Super Admin upon subscription plan verification.', 403);
    }
    if (institute.status === 'suspended') {
      return apiError('This institute has been suspended. Please contact support.', 403);
    }
    if (institute.status === 'inactive' || institute.status === 'deleted') {
      return apiError('This institute is not active. Please contact support.', 403);
    }

    // Find user within institute
    const dbUser = await UserDoc.findOne({
      instituteId: institute._id,
      isActive: true,
      deletedAt: null,
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier },
        { studentId: identifier },
      ],
    }).lean();

    if (!dbUser) {
      return apiError('Invalid credentials', 401);
    }

    if (!verifyPassword(password, dbUser.passwordHash)) {
      return apiError('Invalid credentials', 401);
    }

    const user = mapDbUser(dbUser as unknown as Record<string, unknown>);
    const payload = { userId: user.id, role: user.role, instituteId: user.instituteId };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await createRefreshTokenRecord(user.id, refreshToken);

    await UserDoc.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });

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
