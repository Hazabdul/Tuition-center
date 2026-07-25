export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return apiError('Not authenticated', 401);
    }

    return apiSuccess({ user }, 'Current user retrieved');
  } catch (error) {
    console.error('Get me error:', error);
    return apiError('An error occurred', 500);
  }
}
