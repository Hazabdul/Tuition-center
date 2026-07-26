export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import UserDoc from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, code, email, phone, address, city, stateRegion, country,
      contactPersonName, contactPersonPhone, contactPersonEmail,
      adminFirstName, adminLastName, adminEmail, adminUsername, adminPassword,
      planId,
    } = body;

    if (!name) return apiError('Institute name is required', 400);
    if (!adminEmail || !adminPassword) return apiError('Admin email and password are required', 400);
    if (!planId) return apiError('Please select a subscription plan', 400);

    let instCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase();
    if (!instCode) instCode = `INST${Math.floor(1000 + Math.random() * 9000)}`;

    await dbConnect();

    const existingCode = await InstituteDoc.findOne({ code: instCode }).lean();
    if (existingCode) {
      instCode = `${instCode}${Math.floor(10 + Math.random() * 90)}`;
    }

    const plan = mongoose.Types.ObjectId.isValid(planId)
      ? await SubscriptionPlanDoc.findById(planId).lean()
      : await SubscriptionPlanDoc.findOne({ code: planId }).lean();

    const studentLimit = plan?.studentLimit || 100;
    const teacherLimit = plan?.teacherLimit || 20;
    const adminLimit = plan?.adminLimit || 3;

    // 1. Create Institute in pending_activation status
    const institute: any = await InstituteDoc.create({
      name,
      code: instCode,
      email: email || adminEmail,
      phone: phone || contactPersonPhone,
      address, city, stateRegion, country: country || 'India',
      status: 'pending_activation',
      studentLimit,
      teacherLimit,
      adminLimit,
    });

    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 1);

    // 2. Insert Subscription Record
    if (plan) {
      await InstituteSubscriptionDoc.create({
        instituteId: institute._id,
        planId: plan._id,
        status: 'pending_activation',
        startDate: today,
        expiryDate: futureDate,
      });
    }

    // 3. Create Primary Admin User
    const finalUsername = adminUsername || `admin_${instCode.toLowerCase()}`;
    const pwdHash = hashPassword(adminPassword);

    await UserDoc.create({
      instituteId: institute._id,
      role: 'institute_admin',
      username: finalUsername,
      email: adminEmail,
      passwordHash: pwdHash,
      firstName: adminFirstName || contactPersonName || 'Institute',
      lastName: adminLastName || 'Admin',
      phone: phone || contactPersonPhone,
      isActive: false, // Activated when Super Admin approves
    });

    await logActivity({
      instituteId: institute._id.toString(),
      action: 'institute_self_registered',
      entityType: 'institute',
      entityId: institute._id.toString(),
      newValues: { name, code: instCode, planName: plan?.name },
      request,
    });

    return apiSuccess({
      instituteId: institute._id.toString(),
      code: instCode,
      name: institute.name,
      status: 'pending_activation',
      planName: plan?.name,
      adminCredentials: { username: finalUsername, email: adminEmail },
    }, 'Institute registration submitted successfully! Your account is currently pending activation by Super Admin upon subscription plan verification.');
  } catch (error) {
    console.error('Institute registration error:', error);
    return apiError('An error occurred during registration', 500);
  }
}
