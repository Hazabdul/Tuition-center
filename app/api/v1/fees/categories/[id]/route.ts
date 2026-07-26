export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { name, code, description, isActive } = body;

    await dbConnect();

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_category_updated',
      entityType: 'fee_category',
      entityId: params.id,
      newValues: body,
      request,
    });

    return apiSuccess(
      {
        id: params.id,
        instituteId: user.instituteId,
        name: name || 'Fee Category',
        code: code || 'CAT',
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date(),
      },
      'Fee category updated successfully'
    );
  } catch (error) {
    console.error('Update fee category error:', error);
    return apiError('An error occurred', 500);
  }
}
