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

  // Decode JWT payload (without verification — verification happens on API)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check token expiration
    if (payload.exp * 1000 < Date.now()) {
      const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
      response.cookies.delete('access_token');
      return response;
    }

    // Check role-based route access
    for (const [route, roles] of Object.entries(roleRouteMap)) {
      if (pathname.startsWith(route) && !roles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/dashboard/overview', request.url));
      }
    }
  } catch {
    const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
