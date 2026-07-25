export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import {
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  mapDbUser,
  apiSuccess,
  apiError,
  getUserFromRequest,
  logActivity,
  JwtPayload,
} from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import UserDoc from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);

    if (!currentUser || currentUser.role !== 'super_admin') {
      return apiError('Unauthorized: Only Super Admins can impersonate institute accounts', 403);
    }

    const body = await request.json();
    const { instituteId } = body;

    if (!instituteId) {
      return apiError('Institute ID is required', 400);
    }

    await dbConnect();

    // Check institute exists
    const institute = await InstituteDoc.findOne({ _id: instituteId, deletedAt: null }).lean();

    if (!institute) {
      return apiError('Institute not found', 404);
    }

    // Find primary institute admin user
    const instAdminDb = await UserDoc.findOne({
      instituteId: institute._id,
      role: 'institute_admin',
      isActive: true,
      deletedAt: null,
    }).lean();

    if (!instAdminDb) {
      return apiError('No active Institute Admin found for this institute', 404);
    }

    const instAdminUser = mapDbUser(instAdminDb as unknown as Record<string, unknown>);

    const payload = {
      userId: instAdminUser.id,
      role: instAdminUser.role,
      instituteId: instAdminUser.instituteId,
      isImpersonating: true,
      originalUserId: currentUser.id,
      originalRole: currentUser.role,
    };

    const accessToken = signAccessToken(payload as unknown as JwtPayload);
    const refreshToken = signRefreshToken(payload as unknown as JwtPayload);
    await createRefreshTokenRecord(instAdminUser.id, refreshToken);

    await logActivity({
      instituteId: institute._id.toString(),
      userId: currentUser.id,
      action: 'super_admin.impersonate',
      entityType: 'institute',
      entityId: institute._id.toString(),
      newValues: { impersonatedUserId: instAdminUser.id, instituteName: institute.name },
      request,
    });

    const response = apiSuccess(
      {
        user: instAdminUser,
        accessToken,
        refreshToken,
        instituteName: institute.name,
        redirectPath: '/admin',
      },
      `Switched session to ${institute.name}`
    );

    response.headers.append(
      'Set-Cookie',
      `access_token=${accessToken}; Path=/; Max-Age=900; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    response.headers.append(
      'Set-Cookie',
      `refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    response.headers.append(
      'Set-Cookie',
      `is_impersonating=true; Path=/; Max-Age=3600; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    response.headers.append(
      'Set-Cookie',
      `impersonated_institute_name=${encodeURIComponent(institute.name)}; Path=/; Max-Age=3600; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    console.error('Impersonation error:', error);
    return apiError('Failed to impersonate institute admin', 500);
  }
}
