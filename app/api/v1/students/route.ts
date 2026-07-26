export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import StudentDoc from '@/models/Student';
import UserDoc from '@/models/User';
import InstituteDoc from '@/models/Institute';
import BatchDoc from '@/models/Batch';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const batchId = searchParams.get('batchId') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const filter: Record<string, unknown> = {
      instituteId: instituteObjId,
      deletedAt: null,
    };

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { fatherName: regex },
        { studentId: regex },
        { admissionNumber: regex },
        { email: regex },
      ];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    if (user.role === 'teacher') {
      const TeacherDoc = (await import('@/models/Teacher')).default;
      const teacher = await TeacherDoc.findOne({ userId: new mongoose.Types.ObjectId(user.id), deletedAt: null }).select('_id').lean();
      if (teacher) {
        const batches = await BatchDoc.find({ instituteId: instituteObjId, teachers: teacher._id, deletedAt: null }).select('students').lean();
        const studentIds = Array.from(new Set(batches.flatMap((b) => (b.students || []).map((s) => s.toString()))));
        filter._id = { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) };
      }
    } else if (user.role === 'parent') {
      const ParentDoc = (await import('@/models/Parent')).default;
      const parent = await ParentDoc.findOne({ userId: new mongoose.Types.ObjectId(user.id), deletedAt: null }).select('children').lean();
      if (parent && Array.isArray(parent.children) && parent.children.length > 0) {
        filter._id = { $in: parent.children };
      }
    }

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batch = await BatchDoc.findById(batchId).select('students').lean();
      if (batch && Array.isArray(batch.students)) {
        filter._id = { $in: batch.students };
      }
    }

    const sortField: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      StudentDoc.find(filter)
        .select('_id studentId admissionNumber firstName lastName fatherName email phone gender academicYear isActive createdAt')
        .sort(sortField)
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentDoc.countDocuments(filter),
    ]);

    const data = records.map((s) => ({
      id: s._id.toString(),
      studentId: s.studentId,
      student_id: s.studentId,
      admissionNumber: s.admissionNumber ?? null,
      admission_number: s.admissionNumber ?? null,
      firstName: s.firstName,
      first_name: s.firstName,
      lastName: s.lastName ?? null,
      last_name: s.lastName ?? null,
      fatherName: s.fatherName ?? null,
      father_name: s.fatherName ?? null,
      email: s.email ?? null,
      phone: s.phone ?? null,
      gender: s.gender ?? null,
      academicYear: s.academicYear ?? null,
      academic_year: s.academicYear ?? null,
      isActive: s.isActive,
      is_active: s.isActive,
      createdAt: s.createdAt,
      created_at: s.createdAt,
    }));

    return apiSuccess(data, 'Students fetched', {
      page, limit, total, totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List students error:', error);
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
    const {
      studentId, admissionNumber, firstName, lastName, fatherName, dateOfBirth, gender,
      email, phone, altPhone, address, academicYear, batchId,
      emergencyContactName, emergencyContactPhone, notes, username, password,
    } = body;

    const finalFatherName = fatherName || body.father_name || null;

    if (!studentId || !firstName) {
      return apiError('Student ID and first name are required', 400);
    }

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const [studentCount, institute] = await Promise.all([
      StudentDoc.countDocuments({ instituteId: instituteObjId, deletedAt: null }),
      InstituteDoc.findById(instituteObjId).select('studentLimit').lean(),
    ]);

    const studentLimit = institute?.studentLimit ?? 100;
    if (studentCount >= studentLimit) {
      return apiError(`Student limit (${studentLimit}) reached for this institute`, 400);
    }

    const existingSid = await StudentDoc.findOne({
      instituteId: instituteObjId,
      studentId: studentId.trim(),
      deletedAt: null,
    }).lean();
    if (existingSid) return apiError('Student ID already exists in this institute', 409);

    if (admissionNumber) {
      const existingAdm = await StudentDoc.findOne({
        instituteId: instituteObjId,
        admissionNumber: admissionNumber.trim(),
        deletedAt: null,
      }).lean();
      if (existingAdm) return apiError('Admission number already exists in this institute', 409);
    }

    let userId: mongoose.Types.ObjectId | null = null;
    if (username && password) {
      const existingUser = await UserDoc.findOne({
        instituteId: instituteObjId,
        username: username.trim(),
        deletedAt: null,
      }).lean();
      if (existingUser) return apiError('Username already exists', 409);

      const newUser = await UserDoc.create({
        instituteId: instituteObjId,
        role: 'student',
        username: username.trim(),
        email: email ? email.toLowerCase().trim() : null,
        phone: phone || null,
        studentId: studentId.trim(),
        passwordHash: hashPassword(password),
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        isActive: true,
      });
      userId = newUser._id as mongoose.Types.ObjectId;
    }

    const student = await StudentDoc.create({
      instituteId: instituteObjId,
      userId,
      studentId: studentId.trim(),
      admissionNumber: admissionNumber?.trim() || null,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      fatherName: finalFatherName?.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      altPhone: altPhone || null,
      address: address || null,
      academicYear: academicYear || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      notes: notes || null,
      isActive: true,
    });

    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      await BatchDoc.findByIdAndUpdate(batchId, {
        $addToSet: { students: student._id },
      });
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'student_created',
      entityType: 'student',
      entityId: student._id.toString(),
      newValues: { studentId, firstName, lastName, fatherName: finalFatherName },
      request,
    });

    return apiSuccess(
      { id: student._id.toString(), studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, fatherName: student.fatherName },
      'Student created successfully'
    );
  } catch (error) {
    console.error('Create student error:', error);
    return apiError('An error occurred', 500);
  }
}
