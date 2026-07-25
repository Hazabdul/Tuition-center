import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { Role, User } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-dev-key-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev-key-change-in-production';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  role: Role;
  instituteId: string | null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

export async function createRefreshTokenRecord(userId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
}

export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string
): Promise<boolean> {
  const { data: tokens } = await supabase
    .from('refresh_tokens')
    .select('id, token_hash, revoked')
    .eq('user_id', userId)
    .eq('revoked', false)
    .gte('expires_at', new Date().toISOString());

  if (!tokens || tokens.length === 0) return false;

  let matched = false;
  let oldTokenId: string | null = null;
  for (const t of tokens) {
    if (bcrypt.compareSync(oldToken, t.token_hash)) {
      matched = true;
      oldTokenId = t.id;
      break;
    }
  }

  if (!matched) return false;

  const newTokenHash = hashToken(newToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: newRecord } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token_hash: newTokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (oldTokenId && newRecord) {
    await supabase
      .from('refresh_tokens')
      .update({ revoked: true, replaced_by: newRecord.id })
      .eq('id', oldTokenId);
  }

  return true;
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false);
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) token = match[1];
    }
  }
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!data) return null;

  return mapDbUser(data as Record<string, unknown>);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!data) return null;
  return mapDbUser(data as Record<string, unknown>);
}

export function mapDbUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    instituteId: (data.institute_id as string) || null,
    role: data.role as Role,
    username: (data.username as string) || null,
    email: (data.email as string) || null,
    phone: (data.phone as string) || null,
    studentId: (data.student_id as string) || null,
    firstName: data.first_name as string,
    lastName: (data.last_name as string) || null,
    profilePhotoUrl: (data.profile_photo_url as string) || null,
    isActive: data.is_active as boolean,
    lastLoginAt: (data.last_login_at as string) || null,
    createdAt: data.created_at as string,
  };
}

export async function validateInstituteAccess(instituteId: string): Promise<{ valid: boolean; reason?: string }> {
  const { data: institute } = await supabase
    .from('institutes')
    .select('status, deleted_at')
    .eq('id', instituteId)
    .single();

  if (!institute) return { valid: false, reason: 'Institute not found' };
  if ((institute as Record<string, unknown>).deleted_at) return { valid: false, reason: 'Institute has been deleted' };
  if ((institute as Record<string, unknown>).status === 'suspended') return { valid: false, reason: 'Institute is suspended' };
  if ((institute as Record<string, unknown>).status === 'inactive') return { valid: false, reason: 'Institute is inactive' };

  const { data: sub } = await supabase
    .from('institute_subscriptions')
    .select('status, expiry_date')
    .eq('institute_id', instituteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (sub) {
    const subData = sub as Record<string, unknown>;
    if (subData.status === 'suspended' || subData.status === 'cancelled') {
      return { valid: false, reason: 'Subscription is not active' };
    }
    if (subData.status === 'expired' || (subData.expiry_date && new Date(subData.expiry_date as string) < new Date())) {
      return { valid: false, reason: 'Subscription has expired' };
    }
  }

  return { valid: true };
}

export async function logActivity(params: {
  instituteId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  request?: Request;
}): Promise<void> {
  const ip = params.request?.headers.get('x-forwarded-for') || null;
  const ua = params.request?.headers.get('user-agent') || null;

  await supabase.from('activity_logs').insert({
    institute_id: params.instituteId || null,
    user_id: params.userId || null,
    action: params.action,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    old_values: params.oldValues || null,
    new_values: params.newValues || null,
    ip_address: ip,
    user_agent: ua,
  });
}

export function apiSuccess<T>(data: T, message = 'Operation completed successfully', pagination?: { page: number; limit: number; total: number; totalPages: number }) {
  return Response.json({ success: true, message, data, pagination });
}

export function apiError(message: string, status = 400, errors?: string[]) {
  return Response.json({ success: false, message, errors }, { status });
}

export function requireRole(user: User | null, ...roles: Role[]): User {
  if (!user) throw new Error('Authentication required');
  if (!roles.includes(user.role)) throw new Error('Insufficient permissions');
  return user;
}

export async function getInstituteId(user: User): Promise<string | null> {
  if (user.role === 'super_admin') return null;
  return user.instituteId;
}

export async function createNotification(params: {
  instituteId?: string | null;
  userId?: string | null;
  title: string;
  message: string;
  type?: string;
}): Promise<void> {
  await supabase.from('notifications').insert({
    institute_id: params.instituteId || null,
    user_id: params.userId || null,
    title: params.title,
    message: params.message,
    type: params.type || 'info',
  });
}
