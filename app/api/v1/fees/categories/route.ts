export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';

const DEFAULT_CATEGORIES = [
  { id: 'cat_tuition', name: 'Tuition Fee', code: 'TUITION', description: 'Regular tuition fee', isActive: true },
  { id: 'cat_exam', name: 'Exam Fee', code: 'EXAM', description: 'Examination fee', isActive: true },
  { id: 'cat_lab', name: 'Lab Fee', code: 'LAB', description: 'Practical and laboratory fee', isActive: true },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    return apiSuccess(DEFAULT_CATEGORIES, 'Fee categories fetched', {
      page: 1, limit: 20, total: DEFAULT_CATEGORIES.length, totalPages: 1,
    });
  } catch (error) {
    console.error('List fee categories error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { name, code, description, isActive } = body;

    if (!name || !code) return apiError('Name and code are required', 400);

    const newCategory = {
      id: `cat_${code.toLowerCase()}`,
      instituteId: user.instituteId,
      name,
      code,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(),
    };

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'fee_category_created',
      entityType: 'fee_category',
      entityId: newCategory.id,
      newValues: body,
      request,
    });

    return apiSuccess(newCategory, 'Fee category created successfully');
  } catch (error) {
    console.error('Create fee category error:', error);
    return apiError('An error occurred', 500);
  }
}
