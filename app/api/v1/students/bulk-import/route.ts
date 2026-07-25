export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'institute_admin' && user.role !== 'super_admin')) {
      return apiError('Unauthorized: Only Institute Admins can bulk import students', 403);
    }

    const instituteId = user.instituteId;
    if (!instituteId) return apiError('No institute associated with user', 400);

    const body = await request.json();
    const { students, defaultBatchId } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return apiError('Students list is required', 400);
    }

    const defaultPwdHash = hashPassword('Password@123');
    let importedCount = 0;

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const username = s.username || `${s.firstName.toLowerCase()}_${String(Date.now()).slice(-4)}`;
      const email = s.email || `${username}@apexacademy.edu`;

      // 1. Create User
      const { data: u, error: uErr } = await supabase.from('users').insert({
        institute_id: instituteId,
        role: 'student',
        username: username,
        email: email,
        password_hash: defaultPwdHash,
        first_name: s.firstName,
        last_name: s.lastName,
        is_active: true,
      }).select().single();

      if (uErr || !u) continue;

      // 2. Create Student Profile
      const { data: st, error: sErr } = await supabase.from('students').insert({
        institute_id: instituteId,
        user_id: u.id,
        student_id: `STU-${String(Date.now()).slice(-5)}-${i + 1}`,
        admission_number: `ADM-${String(Date.now()).slice(-5)}-${i + 1}`,
        first_name: s.firstName,
        last_name: s.lastName,
        email: email,
        phone: s.phone || null,
        gender: s.gender || 'male',
        is_active: true,
      }).select().single();

      if (sErr || !st) continue;

      // 3. Batch Enrollment
      const targetBatchId = s.batchId || defaultBatchId;
      if (targetBatchId) {
        await supabase.from('student_batch').insert({
          institute_id: instituteId,
          student_id: st.id,
          batch_id: targetBatchId,
          roll_number: `ROLL-${i + 1}`,
        });
      }

      importedCount++;
    }

    await logActivity({
      instituteId,
      userId: user.id,
      action: 'students.bulk_import',
      entityType: 'student',
      newValues: { importedCount },
      request,
    });

    return apiSuccess({ importedCount }, `Successfully bulk imported ${importedCount} students!`);
  } catch (error) {
    console.error('Bulk import students error:', error);
    return apiError('Failed to bulk import students', 500);
  }
}
