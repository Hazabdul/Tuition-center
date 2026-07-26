export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import ParentDoc from '@/models/Parent';
import mongoose from 'mongoose';

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

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);
    const toInsert: Record<string, unknown>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = row.firstName || row.first_name || row['First Name'] || row.Name;
      const lastName = row.lastName || row.last_name || row['Last Name'] || '';
      const email = (row.email || row.Email || null)?.toLowerCase?.().trim() || null;
      const phone = row.phone || row.Phone || null;
      const occupation = row.occupation || row.Occupation || null;
      const address = row.address || row.Address || null;

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      toInsert.push({
        instituteId: instituteObjId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email,
        phone,
        occupation,
        address,
        isActive: true,
      });
    }

    let createdCount = 0;
    if (toInsert.length > 0) {
      const inserted = await ParentDoc.insertMany(toInsert, { ordered: false });
      createdCount = inserted.length;
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
