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

    // Quota check
    const { count: currentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const { data: institute } = await supabase.from('institutes').select('student_limit').eq('id', user.instituteId).single();
    const studentLimit = (institute as Record<string, unknown>)?.student_limit as unknown as number || 1000;

    if ((currentCount || 0) + rows.length > studentLimit) {
      return apiError(`Importing ${rows.length} students would exceed institute student quota (${currentCount || 0}/${studentLimit})`, 400);
    }

    // Get existing student_ids for duplicate checking
    const { data: existingStudents } = await supabase
      .from('students')
      .select('student_id')
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const existingIdSet = new Set((existingStudents || []).map(s => s.student_id?.toLowerCase()));

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = row.firstName || row.first_name || row['First Name'] || row.Name;
      const lastName = row.lastName || row.last_name || row['Last Name'] || '';
      let studentId = (row.studentId || row.student_id || row['Student ID'] || row.ID || '').toString().trim();
      const email = row.email || row.Email || null;
      const phone = row.phone || row.Phone || null;
      const gender = row.gender || row.Gender || 'other';
      const address = row.address || row.Address || null;

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      if (!studentId) {
        studentId = `STU${Math.floor(10000 + Math.random() * 90000)}`;
      }

      if (existingIdSet.has(studentId.toLowerCase())) {
        studentId = `${studentId}_${Math.floor(10 + Math.random() * 90)}`;
      }

      existingIdSet.add(studentId.toLowerCase());

      toInsert.push({
        institute_id: user.instituteId,
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        gender: ['male', 'female', 'other'].includes(gender?.toLowerCase()) ? gender.toLowerCase() : 'other',
        address,
        is_active: true,
      });
    }

    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabase
        .from('students')
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
      action: 'students_bulk_imported',
      entityType: 'student',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} students imported successfully`
    );
  } catch (error) {
    console.error('Import students error:', error);
    return apiError('An error occurred during import', 500);
  }
}
