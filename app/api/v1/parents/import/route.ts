export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const rows = Array.isArray(body) ? body : body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError('Rows array is required', 400);
    }

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = row.firstName || row.first_name || row['First Name'] || row.Name;
      const lastName = row.lastName || row.last_name || row['Last Name'] || '';
      const email = row.email || row.Email || null;
      const phone = row.phone || row.Phone || null;
      const occupation = row.occupation || row.Occupation || null;
      const address = row.address || row.Address || null;

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      toInsert.push({
        institute_id: user.instituteId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        occupation,
        address,
        is_active: true,
      });
    }

    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabase
        .from('parents')
        .insert(toInsert)
        .select('id');

      if (error) {
        return apiError(error.message, 400);
      }
      createdCount = inserted?.length || 0;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'parents_bulk_imported',
      entityType: 'parent',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} parents imported successfully`
    );
  } catch (error) {
    console.error('Import parents error:', error);
    return apiError('An error occurred during import', 500);
  }
}
