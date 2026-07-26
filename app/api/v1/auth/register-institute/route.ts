export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, hashPassword, signAccessToken, signRefreshToken, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import SubscriptionPlanDoc from '@/models/SubscriptionPlan';
import InstituteSubscriptionDoc from '@/models/InstituteSubscription';
import UserDoc from '@/models/User';
import GradingRuleDoc from '@/models/GradingRule';
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

    if (!name || typeof name !== 'string' || !name.trim()) {
      return apiError('Institute name is required', 400);
    }
    if (!adminEmail || !adminPassword) {
      return apiError('Admin email and password are required', 400);
    }
    if (!planId) {
      return apiError('Please select a subscription plan', 400);
    }

    await dbConnect();

    // Check if user already exists
    const finalUsername = (adminUsername || `admin_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`).trim();
    const existingUser = await UserDoc.findOne({
      $or: [{ email: adminEmail.toLowerCase().trim() }, { username: finalUsername.toLowerCase() }],
    }).lean();

    if (existingUser) {
      return apiError('An account with this email or username already exists', 400);
    }

    // Determine institute code
    let instCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase().trim();
    if (!instCode) instCode = `INST${Math.floor(1000 + Math.random() * 9000)}`;

    const existingCode = await InstituteDoc.findOne({ code: instCode }).lean();
    if (existingCode) {
      instCode = `${instCode}${Math.floor(10 + Math.random() * 90)}`;
    }

    // Find selected plan
    const plan = mongoose.Types.ObjectId.isValid(planId)
      ? await SubscriptionPlanDoc.findById(planId).lean()
      : await SubscriptionPlanDoc.findOne({ code: planId }).lean();

    const studentLimit = plan?.studentLimit || 100;
    const teacherLimit = plan?.teacherLimit || 20;
    const adminLimit = plan?.adminLimit || 3;

    // 1. Create Institute Record (Active status)
    const institute: any = await InstituteDoc.create({
      name: name.trim(),
      code: instCode,
      email: (email || adminEmail).toLowerCase().trim(),
      phone: phone || contactPersonPhone || '',
      address: address || '',
      city: city || '',
      stateRegion: stateRegion || '',
      country: country || 'India',
      contactPersonName: contactPersonName || adminFirstName || '',
      contactPersonPhone: contactPersonPhone || phone || '',
      contactPersonEmail: contactPersonEmail || adminEmail || '',
      status: 'active',
      studentLimit,
      teacherLimit,
      adminLimit,
    });

    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 1);

    // 2. Create Institute Subscription Record
    if (plan) {
      await InstituteSubscriptionDoc.create({
        instituteId: institute._id,
        planId: plan._id,
        status: 'active',
        startDate: today,
        expiryDate: futureDate,
      });
    }

    // 3. Create Primary Admin User
    const pwdHash = hashPassword(adminPassword);

    const adminUser: any = await UserDoc.create({
      instituteId: institute._id,
      role: 'institute_admin',
      username: finalUsername,
      email: adminEmail.toLowerCase().trim(),
      passwordHash: pwdHash,
      firstName: adminFirstName || contactPersonName || 'Institute',
      lastName: adminLastName || 'Admin',
      phone: phone || contactPersonPhone || '',
      isActive: true,
    });

    // 4. Seed Default Grading Rules for the new Institute
    const defaultGradingRules = [
      { minPercentage: 90, maxPercentage: 100, grade: 'A+' },
      { minPercentage: 80, maxPercentage: 89.9, grade: 'A' },
      { minPercentage: 70, maxPercentage: 79.9, grade: 'B' },
      { minPercentage: 60, maxPercentage: 69.9, grade: 'C' },
      { minPercentage: 50, maxPercentage: 59.9, grade: 'D' },
      { minPercentage: 0, maxPercentage: 49.9, grade: 'F' },
    ];
    await GradingRuleDoc.insertMany(
      defaultGradingRules.map((rule) => ({
        instituteId: institute._id,
        ...rule,
      }))
    );

    // 5. Generate Auth Tokens for Immediate Admin Session
    const jwtPayload = {
      userId: adminUser._id.toString(),
      role: adminUser.role as any,
      instituteId: institute._id.toString(),
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    await logActivity({
      instituteId: institute._id.toString(),
      userId: adminUser._id.toString(),
      action: 'institute_self_registered',
      entityType: 'institute',
      entityId: institute._id.toString(),
      newValues: { name: institute.name, code: instCode, planName: plan?.name },
      request,
    });

    return apiSuccess({
      instituteId: institute._id.toString(),
      code: instCode,
      name: institute.name,
      status: 'active',
      planName: plan?.name,
      accessToken,
      refreshToken,
      redirectPath: '/institute-admin/dashboard',
      adminCredentials: {
        id: adminUser._id.toString(),
        username: finalUsername,
        email: adminEmail,
        code: instCode,
      },
    }, 'Institute registered successfully!');
  } catch (error: any) {
    console.error('Institute registration error:', error);
    return apiError(error?.message || 'An error occurred during registration', 500);
  }
}
