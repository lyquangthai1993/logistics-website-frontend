import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/auth/sign-in', '/auth'];
const roleRouteMap: Record<string, string[]> = {
  '/dashboard/admin': ['SUPER_ADMIN'],
  '/dashboard/orders': ['SUPER_ADMIN', 'DISPATCHER'],
  '/dashboard/trips': ['SUPER_ADMIN', 'DISPATCHER', 'FLEET_MANAGER'],
  '/dashboard/fleet': ['SUPER_ADMIN', 'FLEET_MANAGER'],
  '/dashboard/warehouse': ['SUPER_ADMIN', 'WAREHOUSE_MANAGER']
};

const roleMap: Record<number | string, string> = {
  1: 'SUPER_ADMIN',
  2: 'DISPATCHER',
  3: 'FLEET_MANAGER',
  4: 'WAREHOUSE_MANAGER'
};

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check auth token from cookie
  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // Decode JWT payload safely
  const payload = parseJwt(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // Check token expiration
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // Extract user role string
  const userRole =
    typeof payload.role === 'object' && payload.role?.id
      ? roleMap[payload.role.id]
      : roleMap[payload.role] || payload.role;

  // Check role-based route access
  for (const [route, roles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(route) && !roles.includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard/overview', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
