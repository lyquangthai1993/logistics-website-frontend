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

async function refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken?: string } | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.token || data?.access_token || data?.data?.token || data?.data?.access_token;
    if (!token) return null;

    return {
      token,
      refreshToken: data?.refreshToken || data?.refresh_token
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  let token = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value || request.cookies.get('refresh_token')?.value;
  let payload = token ? parseJwt(token) : null;
  let isRefreshed = false;
  let newRefreshToken: string | undefined;

  // Check if token is missing or expired
  const isExpired = !payload || (payload.exp && payload.exp * 1000 < Date.now());

  if (isExpired && refreshToken) {
    const refreshResult = await refreshAccessToken(refreshToken);
    if (refreshResult?.token) {
      token = refreshResult.token;
      payload = parseJwt(token);
      isRefreshed = true;
      newRefreshToken = refreshResult.refreshToken;
    }
  }

  // If token is still invalid after refresh attempt, redirect to sign-in
  if (!token || !payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refreshToken');
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
      const redirectUrl = new URL('/dashboard/overview', request.url);
      const response = NextResponse.redirect(redirectUrl);
      if (isRefreshed) {
        response.cookies.set('access_token', token, { path: '/', maxAge: 24 * 60 * 60, sameSite: 'lax' });
        if (newRefreshToken) {
          response.cookies.set('refreshToken', newRefreshToken, { path: '/', maxAge: 30 * 24 * 60 * 60, sameSite: 'lax', httpOnly: true });
        }
      }
      return response;
    }
  }

  const response = NextResponse.next();
  if (isRefreshed) {
    response.cookies.set('access_token', token, { path: '/', maxAge: 24 * 60 * 60, sameSite: 'lax' });
    if (newRefreshToken) {
      response.cookies.set('refreshToken', newRefreshToken, { path: '/', maxAge: 30 * 24 * 60 * 60, sameSite: 'lax', httpOnly: true });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
