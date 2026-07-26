export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { hashPassword, apiSuccess, apiError } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import PasswordResetTokenDoc from '@/models/PasswordResetToken';
import UserDoc from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return apiError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return apiError('Password must be at least 6 characters', 400);
    }

    await dbConnect();

    const tokens = await PasswordResetTokenDoc.find({
      used: false,
      expiresAt: { $gte: new Date() },
    }).lean();

    if (!tokens || tokens.length === 0) {
      return apiError('Invalid or expired reset token', 400);
    }

    let matchedToken: { _id: unknown; userId: unknown } | null = null;
    for (const t of tokens) {
      if (bcrypt.compareSync(token, t.tokenHash)) {
        matchedToken = t as { _id: unknown; userId: unknown };
        break;
      }
    }

    if (!matchedToken) {
      return apiError('Invalid or expired reset token', 400);
    }

    const newHash = hashPassword(newPassword);
    await Promise.all([
      UserDoc.findByIdAndUpdate(matchedToken.userId, { $set: { passwordHash: newHash } }),
      PasswordResetTokenDoc.findByIdAndUpdate(matchedToken._id, { $set: { used: true } }),
    ]);

    return apiSuccess({}, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return apiError('An error occurred', 500);
  }
}
