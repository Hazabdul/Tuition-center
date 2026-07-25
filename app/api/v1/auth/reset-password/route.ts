export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, hashPassword, apiSuccess, apiError, hashToken } from '@/lib/auth';
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

    // Find valid token
    const { data: tokens } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, token_hash, expires_at, used')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString());

    if (!tokens || tokens.length === 0) {
      return apiError('Invalid or expired reset token', 400);
    }

    let matchedToken: { id: string; user_id: string } | null = null;
    for (const t of tokens) {
      if (bcrypt.compareSync(token, t.token_hash)) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      return apiError('Invalid or expired reset token', 400);
    }

    // Update password
    const newHash = hashPassword(newPassword);
    await supabase.from('users').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', matchedToken.user_id);

    // Mark token as used
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', matchedToken.id);

    return apiSuccess({}, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return apiError('An error occurred', 500);
  }
}
