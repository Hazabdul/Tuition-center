export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { apiSuccess, apiError, hashToken } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import InstituteDoc from '@/models/Institute';
import UserDoc from '@/models/User';
import PasswordResetTokenDoc from '@/models/PasswordResetToken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, instituteCode } = body;

    if (!email || !instituteCode) {
      return apiError('Email and institute code are required', 400);
    }

    await dbConnect();

    const institute = await InstituteDoc.findOne({
      code: instituteCode.toUpperCase().trim(),
      deletedAt: null,
    }).lean();

    if (!institute) {
      return apiSuccess({}, 'If the email is registered, a reset link has been sent');
    }

    const user = await UserDoc.findOne({
      email: email.toLowerCase().trim(),
      instituteId: institute._id,
      isActive: true,
      deletedAt: null,
    }).lean();

    if (!user) {
      return apiSuccess({}, 'If the email is registered, a reset link has been sent');
    }

    const resetToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await PasswordResetTokenDoc.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return apiSuccess(
      { resetToken, message: 'In production, a reset link would be emailed. For development, use the resetToken provided.' },
      'Reset instructions sent'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return apiError('An error occurred', 500);
  }
}
