import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PAGE_PATHS = [
  '/',
  '/auth/login',
  '/auth/super-admin/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/subscription-expired',
  '/suspended',
  '/unauthorized',
];

const PUBLIC_API_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/super-admin/login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/refresh',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.includes(pathname)) return true;
  if (PUBLIC_API_PATHS.includes(pathname)) return true;
  if (pathname.includes('.')) return true; // Static assets
  return false;
}

function getRoleFromPath(pathname: string): string | null {
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/institute-admin')) return 'institute_admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/parent')) return 'parent';
  return null;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const rawData = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function verifyJwtSignature(token: string): Promise<{ userId: string; role: string; instituteId: string | null; exp?: number } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const secret = process.env.JWT_ACCESS_SECRET || 'access-secret-dev-key-change-in-production';

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signature as BufferSource,
      dataToVerify
    );

    if (!isValid) return null;

    const jsonPayload = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const payload = JSON.parse(jsonPayload);

    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-auth-token');

  const role = getRoleFromPath(pathname);
  const isApiRoute = pathname.startsWith('/api/');

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, message: 'Unauthorized access' }, { status: 401 });
    }
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/auth/super-admin/login', request.url));
    }
    if (role) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  }

  const payload = await verifyJwtSignature(token);

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/auth/super-admin/login', request.url));
    }
    if (role) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  }

  // Enforce role-based page access
  if (role && payload.role !== role) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

