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
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const { data: institute } = await supabase.from('institutes').select('teacher_limit').eq('id', user.instituteId).single();
    const teacherLimit = (institute as Record<string, unknown>)?.teacher_limit as unknown as number || 100;

    if ((currentCount || 0) + rows.length > teacherLimit) {
      return apiError(`Importing ${rows.length} teachers would exceed institute teacher quota (${currentCount || 0}/${teacherLimit})`, 400);
    }

    const { data: existingTeachers } = await supabase
      .from('teachers')
      .select('employee_id')
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const existingEmpIdSet = new Set((existingTeachers || []).map(t => t.employee_id?.toLowerCase()));

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = row.firstName || row.first_name || row['First Name'] || row.Name;
      const lastName = row.lastName || row.last_name || row['Last Name'] || '';
      let employeeId = (row.employeeId || row.employee_id || row['Employee ID'] || row.ID || '').toString().trim();
      const email = row.email || row.Email || null;
      const phone = row.phone || row.Phone || null;
      const qualification = row.qualification || row.Qualification || null;
      const specialization = row.specialization || row.Specialization || null;
      const address = row.address || row.Address || null;

      if (!firstName) {
        errors.push(`Row ${i + 1}: First Name is required`);
        continue;
      }

      if (!employeeId) {
        employeeId = `EMP${Math.floor(1000 + Math.random() * 9000)}`;
      }

      if (existingEmpIdSet.has(employeeId.toLowerCase())) {
        employeeId = `${employeeId}_${Math.floor(10 + Math.random() * 90)}`;
      }

      existingEmpIdSet.add(employeeId.toLowerCase());

      toInsert.push({
        institute_id: user.instituteId,
        employee_id: employeeId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        qualification,
        specialization,
        joining_date: new Date().toISOString().split('T')[0],
        address,
        is_active: true,
      });
    }

    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabase
        .from('teachers')
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
      action: 'teachers_bulk_imported',
      entityType: 'teacher',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} teachers imported successfully`
    );
  } catch (error) {
    console.error('Import teachers error:', error);
    return apiError('An error occurred during import', 500);
  }
}
