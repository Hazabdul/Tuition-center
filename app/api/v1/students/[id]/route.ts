export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import UserDoc from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (user.role !== 'super_admin' && !user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const query: Record<string, unknown> = { _id: params.id, deletedAt: null };
    if (user.role !== 'super_admin' && user.instituteId) {
      query.instituteId = user.instituteId;
    }

    const student = await StudentDoc.findOne(query).lean();
    if (!student) return apiError('Student not found', 404);

    let userAccount: any = null;
    if (student.userId) {
      userAccount = await UserDoc.findOne({ _id: student.userId }).select('username isActive').lean();
    }

    return apiSuccess({
      ...(student as any),
      id: (student as any)._id.toString(),
      father_name: (student as any).fatherName ?? null,
      user: userAccount ? { ...userAccount, id: userAccount._id.toString() } : null,
      batches: [],
      parents: [],
      subjects: [],
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
    if (user.role !== 'super_admin' && !user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const body = await request.json();
    const { studentId, admissionNumber, firstName, lastName, fatherName, dateOfBirth, gender, email, phone, altPhone, address, academicYear, emergencyContactName, emergencyContactPhone, notes, username, password } = body;
    const finalFatherName = fatherName ?? body.father_name ?? undefined;

    const existQuery: Record<string, unknown> = { _id: params.id };
    if (user.role !== 'super_admin' && user.instituteId) {
      existQuery.instituteId = user.instituteId;
    }
    const existing = await StudentDoc.findOne(existQuery);
    if (!existing) return apiError('Student not found', 404);

    const targetInstituteId = existing.instituteId;
    let userId = existing.userId;

    if (username || password) {
      if (userId) {
        const updateFields: Record<string, unknown> = {};
        if (username) {
          const dupUser = await UserDoc.findOne({
            instituteId: targetInstituteId,
            username,
            _id: { $ne: userId },
          });
          if (dupUser) return apiError('Username already exists in this institute', 409);
          updateFields.username = username;
        }
        if (password) {
          if (password.length < 6) return apiError('Password must be at least 6 characters', 400);
          updateFields.passwordHash = hashPassword(password);
        }
        if (firstName) updateFields.firstName = firstName;
        if (lastName !== undefined) updateFields.lastName = lastName;
        if (email !== undefined) updateFields.email = email;
        if (phone !== undefined) updateFields.phone = phone;

        await UserDoc.findByIdAndUpdate(userId, updateFields);
      } else if (username && password) {
        if (password.length < 6) return apiError('Password must be at least 6 characters', 400);
        const dupUser = await UserDoc.findOne({
          instituteId: targetInstituteId,
          username,
        });
        if (dupUser) return apiError('Username already exists in this institute', 409);

        const newUser = await UserDoc.create({
          instituteId: targetInstituteId,
          role: 'student',
          username,
          email: email || null,
          phone: phone || null,
          studentId: studentId || existing.studentId,
          passwordHash: hashPassword(password),
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          isActive: true,
        });
        userId = newUser._id;
      }
    }

    const updateData: Record<string, unknown> = {
      userId,
      studentId: studentId || existing.studentId,
      admissionNumber,
      firstName: firstName || existing.firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      email,
      phone,
      altPhone,
      address,
      academicYear,
      emergencyContactName,
      emergencyContactPhone,
      notes,
    };
    if (finalFatherName !== undefined) {
      updateData.fatherName = finalFatherName;
    }

    const updatedStudent = await StudentDoc.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    await logActivity({
      instituteId: targetInstituteId.toString(),
      userId: user.id,
      action: 'student_updated',
      entityType: 'student',
      entityId: params.id,
      oldValues: existing.toObject() as unknown as Record<string, unknown>,
      newValues: body,
      request,
    });

    return apiSuccess(
      {
        id: updatedStudent?._id.toString(),
        studentId: updatedStudent?.studentId,
        firstName: updatedStudent?.firstName,
        fatherName: updatedStudent?.fatherName,
        userId: updatedStudent?.userId,
      },
      'Student updated successfully'
    );
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

    await dbConnect();

    const delQuery: Record<string, unknown> = { _id: params.id };
    if (user.role !== 'super_admin' && user.instituteId) {
      delQuery.instituteId = user.instituteId;
    }

    await StudentDoc.findOneAndUpdate(delQuery, {
      isActive: false,
      deletedAt: new Date(),
    });

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'student_deleted',
      entityType: 'student',
      entityId: params.id,
      request,
    });

    return apiSuccess(null, 'Student deleted successfully');
  } catch (error) {
    console.error('Delete student error:', error);
    return apiError('An error occurred', 500);
  }
}
