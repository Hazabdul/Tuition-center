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
  getUserFromRequest,
  logActivity,
} from '@/lib/auth';

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

    // Check institute exists
    const { data: institute } = await supabase
      .from('institutes')
      .select('id, name, code, status')
      .eq('id', instituteId)
      .single();

    if (!institute) {
      return apiError('Institute not found', 444);
    }

    // Find primary institute admin user
    const { data: instAdminDb } = await supabase
      .from('users')
      .select('*')
      .eq('institute_id', instituteId)
      .eq('role', 'institute_admin')
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (!instAdminDb) {
      return apiError('No active Institute Admin found for this institute', 404);
    }

    const instAdminUser = mapDbUser(instAdminDb);

    const payload = {
      userId: instAdminUser.id,
      role: instAdminUser.role,
      instituteId: instAdminUser.instituteId,
      isImpersonating: true,
      originalUserId: currentUser.id,
      originalRole: currentUser.role,
    };

    const accessToken = signAccessToken(payload as any);
    const refreshToken = signRefreshToken(payload as any);
    await createRefreshTokenRecord(instAdminUser.id, refreshToken);

    await logActivity({
      instituteId: institute.id,
      userId: currentUser.id,
      action: 'super_admin.impersonate',
      entityType: 'institute',
      entityId: institute.id,
      newValues: { impersonatedUserId: instAdminUser.id, instituteName: institute.name },
      request,
    });

    const response = apiSuccess(
      {
        user: instAdminUser,
        accessToken,
        refreshToken,
        instituteName: institute.name,
        redirectPath: '/institute-admin/dashboard',
      },
      `Switched session to ${institute.name}`
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
      `is_impersonating=true; Path=/; Max-Age=3600; SameSite=Lax`
    );
    response.headers.append(
      'Set-Cookie',
      `impersonated_institute_name=${encodeURIComponent(institute.name)}; Path=/; Max-Age=3600; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error('Impersonation error:', error);
    return apiError('Failed to impersonate institute admin', 500);
  }
}
