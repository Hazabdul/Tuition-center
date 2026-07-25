import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { dbConnect } from './mongodb';
import UserDoc, { IUser } from '@/models/User';
import RefreshTokenDoc from '@/models/RefreshToken';
import InstituteDoc from '@/models/Institute';
import ActivityLogDoc from '@/models/ActivityLog';
import NotificationDoc from '@/models/Notification';
import type { Role, User } from './types';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === 'access-secret-dev-key-change-in-production') {
    console.error('FATAL: JWT_ACCESS_SECRET is not configured for production deployment.');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'refresh-secret-dev-key-change-in-production') {
    console.error('FATAL: JWT_REFRESH_SECRET is not configured for production deployment.');
  }
}

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
  await dbConnect();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshTokenDoc.create({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function rotateRefreshToken(
  oldToken: string,
  newToken: string,
  userId: string
): Promise<boolean> {
  await dbConnect();
  const tokens = await RefreshTokenDoc.find({
    userId,
    revoked: false,
    expiresAt: { $gte: new Date() },
  });

  if (!tokens || tokens.length === 0) return false;

  let matched = false;
  let oldTokenId: string | null = null;
  for (const t of tokens) {
    if (bcrypt.compareSync(oldToken, t.tokenHash)) {
      matched = true;
      oldTokenId = t._id.toString();
      break;
    }
  }

  if (!matched) return false;

  const newTokenHash = hashToken(newToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const newRecord = await RefreshTokenDoc.create({
    userId,
    tokenHash: newTokenHash,
    expiresAt,
  });

  if (oldTokenId && newRecord) {
    await RefreshTokenDoc.findByIdAndUpdate(oldTokenId, {
      revoked: true,
      replacedBy: newRecord._id,
    });
  }

  return true;
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await dbConnect();
  await RefreshTokenDoc.updateMany({ userId, revoked: false }, { revoked: true });
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  await dbConnect();
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

  const data = await UserDoc.findOne({
    _id: payload.userId,
    isActive: true,
    deletedAt: null,
  }).lean();

  if (!data) return null;

  return mapDbUser(data as unknown as Record<string, unknown>);
}

export async function getCurrentUser(): Promise<User | null> {
  await dbConnect();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  const data = await UserDoc.findOne({
    _id: payload.userId,
    isActive: true,
    deletedAt: null,
  }).lean();

  if (!data) return null;
  return mapDbUser(data as unknown as Record<string, unknown>);
}

// Backwards compatibility chainable mock for routes being migrated to Mongoose
const chainableMock: any = {
  select: () => chainableMock,
  insert: () => chainableMock,
  update: () => chainableMock,
  delete: () => chainableMock,
  eq: () => chainableMock,
  neq: () => chainableMock,
  in: () => chainableMock,
  or: () => chainableMock,
  is: () => chainableMock,
  order: () => chainableMock,
  limit: () => chainableMock,
  single: async () => ({ data: null, error: null }),
  maybeSingle: async () => ({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: [], error: null }),
};

export const supabase = {
  from: (_table: string) => chainableMock,
};

export function mapDbUser(data: Record<string, unknown>): User {
  return {
    id: (data._id || data.id) as string,
    instituteId: (data.instituteId || data.institute_id) ? String(data.instituteId || data.institute_id) : null,
    role: data.role as Role,
    username: (data.username as string) || null,
    email: (data.email as string) || null,
    phone: (data.phone as string) || null,
    studentId: (data.studentId || data.student_id) ? String(data.studentId || data.student_id) : null,
    firstName: (data.firstName || data.first_name) as string,
    lastName: (data.lastName || data.last_name) ? String(data.lastName || data.last_name) : null,
    profilePhotoUrl: (data.profilePhotoUrl || data.profile_photo_url) ? String(data.profilePhotoUrl || data.profile_photo_url) : null,
    isActive: Boolean(data.isActive ?? data.is_active ?? true),
    lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt as Date).toISOString() : null,
    createdAt: data.createdAt ? new Date(data.createdAt as Date).toISOString() : new Date().toISOString(),
  };
}

export async function validateInstituteAccess(instituteId: string): Promise<{ valid: boolean; reason?: string }> {
  await dbConnect();
  const institute = await InstituteDoc.findOne({ _id: instituteId }).lean();

  if (!institute) return { valid: false, reason: 'Institute not found' };
  if (institute.deletedAt) return { valid: false, reason: 'Institute has been deleted' };
  if (institute.status === 'suspended') return { valid: false, reason: 'Institute is suspended' };
  if (institute.status === 'inactive') return { valid: false, reason: 'Institute is inactive' };

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
  await dbConnect();
  const ip = params.request?.headers.get('x-forwarded-for') || null;
  const ua = params.request?.headers.get('user-agent') || null;

  await ActivityLogDoc.create({
    instituteId: params.instituteId || null,
    userId: params.userId || null,
    action: params.action,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    oldValues: params.oldValues || null,
    newValues: params.newValues || null,
    ipAddress: ip,
    userAgent: ua,
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
  await dbConnect();
  await NotificationDoc.create({
    instituteId: params.instituteId || null,
    userId: params.userId || null,
    title: params.title,
    message: params.message,
    type: params.type || 'info',
  });
}
