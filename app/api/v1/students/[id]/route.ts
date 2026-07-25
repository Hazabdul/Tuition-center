export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', params.id)
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !student) return apiError('Student not found', 404);

    const { data: batches } = await supabase
      .from('student_batch')
      .select('batch:batches(id, name, code, academic_year)')
      .eq('student_id', params.id);

    const { data: parents } = await supabase
      .from('parent_student')
      .select('parent:parents(id, first_name, last_name, email, phone, relationship)')
      .eq('student_id', params.id);

    // Fetch subjects (direct + batch inherited)
    const { data: directSubjects } = await supabase
      .from('student_subject')
      .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
      .eq('student_id', params.id);

    const batchIds = (batches || []).map(b => (b.batch as any)?.id).filter(Boolean);
    let batchSubjects: any[] = [];
    if (batchIds.length > 0) {
      const { data: bsData } = await supabase
        .from('batch_subject')
        .select('subject:subjects(id, name, code, description, max_marks, passing_marks, is_active)')
        .in('batch_id', batchIds);
      batchSubjects = bsData || [];
    }

    const subMap = new Map<string, any>();
    (batchSubjects || []).forEach((b: any) => {
      if (b.subject) subMap.set(b.subject.id, { ...b.subject, maxMarks: b.subject.max_marks, passingMarks: b.subject.passing_marks, isActive: b.subject.is_active, isDirect: false });
    });
    (directSubjects || []).forEach((d: any) => {
      if (d.subject) subMap.set(d.subject.id, { ...d.subject, maxMarks: d.subject.max_marks, passingMarks: d.subject.passing_marks, isActive: d.subject.is_active, isDirect: true });
    });

    // Fetch user account details if linked
    let userAccount = null;
    if (student.user_id) {
      const { data: uData } = await supabase
        .from('users')
        .select('id, username, is_active')
        .eq('id', student.user_id)
        .maybeSingle();
      userAccount = uData;
    }

    return apiSuccess({
      ...student,
      user: userAccount,
      batches: batches?.map(b => b.batch) || [],
      parents: parents?.map(p => p.parent) || [],
      subjects: Array.from(subMap.values()),
    });
  } catch (error) {
    console.error('Get student error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const { studentId, admissionNumber, firstName, lastName, dateOfBirth, gender, email, phone, altPhone, address, academicYear, emergencyContactName, emergencyContactPhone, notes, username, password } = body;

    const { data: existing } = await supabase.from('students').select('*').eq('id', params.id).eq('institute_id', user.instituteId).maybeSingle();
    if (!existing) return apiError('Student not found', 404);

    let userId = existing.user_id;

    if (username || password) {
      if (userId) {
        // Update existing user credentials
        const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (username) {
          const { data: dupUser } = await supabase
            .from('users')
            .select('id')
            .eq('institute_id', user.instituteId)
            .eq('username', username)
            .neq('id', userId)
            .maybeSingle();
          if (dupUser) return apiError('Username already exists in this institute', 409);
          updateFields.username = username;
        }
        if (password) {
          if (password.length < 6) return apiError('Password must be at least 6 characters', 400);
          updateFields.password_hash = hashPassword(password);
        }
        if (firstName) updateFields.first_name = firstName;
        if (lastName !== undefined) updateFields.last_name = lastName;
        if (email !== undefined) updateFields.email = email;
        if (phone !== undefined) updateFields.phone = phone;

        await supabase.from('users').update(updateFields).eq('id', userId);
      } else if (username && password) {
        // Create new user credentials
        if (password.length < 6) return apiError('Password must be at least 6 characters', 400);
        const { data: dupUser } = await supabase
          .from('users')
          .select('id')
          .eq('institute_id', user.instituteId)
          .eq('username', username)
          .maybeSingle();
        if (dupUser) return apiError('Username already exists in this institute', 409);

        const { data: newUser, error: uErr } = await supabase
          .from('users')
          .insert({
            institute_id: user.instituteId,
            role: 'student',
            username,
            email: email || null,
            phone: phone || null,
            student_id: studentId || existing.student_id,
            password_hash: hashPassword(password),
            first_name: firstName || existing.first_name,
            last_name: lastName || existing.last_name,
            is_active: true,
          })
          .select('id')
          .single();
        if (uErr) return apiError(uErr.message, 400);
        userId = newUser.id;
      }
    }

    const { data: student, error } = await supabase
      .from('students')
      .update({
        user_id: userId,
        student_id: studentId, admission_number: admissionNumber,
        first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth,
        gender, email, phone, alt_phone: altPhone, address, academic_year: academicYear,
        emergency_contact_name: emergencyContactName, emergency_contact_phone: emergencyContactPhone,
        notes, updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('id, student_id, first_name, user_id')
      .single();

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_updated', entityType: 'student', entityId: params.id, oldValues: existing, newValues: body, request });

    return apiSuccess(student, 'Student updated successfully');
  } catch (error) {
    console.error('Update student error:', error);
    return apiError('An error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);

    const { error } = await supabase
      .from('students')
      .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('institute_id', user.instituteId);

    if (error) return apiError(error.message, 400);

    await logActivity({ instituteId: user.instituteId, userId: user.id, action: 'student_deleted', entityType: 'student', entityId: params.id, request });

    return apiSuccess(null, 'Student deleted successfully');
  } catch (error) {
    console.error('Delete student error:', error);
    return apiError('An error occurred', 500);
  }
}
