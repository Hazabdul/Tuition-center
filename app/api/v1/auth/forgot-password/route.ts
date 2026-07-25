export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, hashPassword, apiSuccess, apiError, hashToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, instituteCode } = body;

    if (!email || !instituteCode) {
      return apiError('Email and institute code are required', 400);
    }

    const { data: institute } = await supabase
      .from('institutes')
      .select('id')
      .eq('code', instituteCode)
      .is('deleted_at', null)
      .single();

    if (!institute) {
      // Don't reveal that institute doesn't exist
      return apiSuccess({}, 'If the email is registered, a reset link has been sent');
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('institute_id', institute.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!user) {
      return apiSuccess({}, 'If the email is registered, a reset link has been sent');
    }

    // Generate reset token
    const resetToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    // In production, send email with reset link. For MVP, return token in response (dev only).
    return apiSuccess({ resetToken, message: 'In production, a reset link would be emailed. For development, use the resetToken provided.' }, 'Reset instructions sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    return apiError('An error occurred', 500);
  }
}
