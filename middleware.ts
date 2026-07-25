import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/super-admin/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/subscription-expired',
  '/suspended',
  '/unauthorized',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith('/api/') || pathname.includes('.');
}

function getRoleFromPath(pathname: string): string | null {
  if (pathname.startsWith('/super-admin')) return 'super_admin';
  if (pathname.startsWith('/institute-admin')) return 'institute_admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/parent')) return 'parent';
  return null;
}

function parseJwtPayload(token: string): { userId: string; role: string; instituteId: string | null; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonPayload = typeof atob === 'function' 
      ? atob(base64) 
      : Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-auth-token');

  const role = getRoleFromPath(pathname);

  if (!token) {
    if (role === 'super_admin') {
      return NextResponse.redirect(new URL('/auth/super-admin/login', request.url));
    }
    if (role) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  }

  const payload = parseJwtPayload(token);

  if (!payload) {
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
