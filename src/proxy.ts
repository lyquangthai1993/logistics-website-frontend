import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/auth/sign-in', '/auth/forgot-password', '/auth/reset-password', '/auth'];
const publicApiRoutes = [
  '/api/v1/auth/email/login',
  '/api/v1/auth/forgot/password',
  '/api/v1/auth/reset/password',
  '/api/v1/auth/confirm'
];

const roleRouteMap: Record<string, string[]> = {
  '/dashboard/admin': ['SUPER_ADMIN'],
  '/dashboard/users': ['SUPER_ADMIN'],
  '/dashboard/orders': ['SUPER_ADMIN', 'DISPATCHER', 'FLEET_MANAGER', 'WAREHOUSE_MANAGER'],
  '/dashboard/trips': ['SUPER_ADMIN', 'FLEET_MANAGER'],
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

const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://logistics-website-backend-1.onrender.com'
    : 'http://localhost:3001';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  DEFAULT_API_URL
).replace(/\/+$/, '');

async function refreshAccessToken(
  refreshToken: string
): Promise<{ token: string; refreshToken?: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const payload = data?.data || data || {};
    const token = payload?.token || payload?.access_token || data?.token || data?.access_token;
    if (!token) return null;

    const newRefreshToken =
      payload?.refreshToken || payload?.refresh_token || data?.refreshToken || data?.refresh_token;

    return {
      token,
      refreshToken: newRefreshToken
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always pass OPTIONS preflight requests directly to handlers without triggering redirects
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // 2. Bypass public API routes from session auth redirects
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  let token = request.cookies.get('access_token')?.value;
  const refreshToken =
    request.cookies.get('refreshToken')?.value || request.cookies.get('refresh_token')?.value;
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

  const isAuthenticated =
    !!token && !!payload && (!payload.exp || payload.exp * 1000 >= Date.now());

  // If user is already authenticated and visits public auth routes (/auth/sign-in, /auth), redirect to dashboard
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const response = NextResponse.redirect(new URL('/dashboard/overview', request.url));
      if (isRefreshed && token) {
        response.cookies.set('access_token', token, {
          path: '/',
          maxAge: 24 * 60 * 60,
          sameSite: 'lax'
        });
        if (newRefreshToken) {
          response.cookies.set('refreshToken', newRefreshToken, {
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
            sameSite: 'lax'
          });
        }
      }
      return response;
    }
    // If accessing auth routes while not authenticated, clean any stale/expired cookies to prevent loops
    const response = NextResponse.next();
    if (token || refreshToken) {
      response.cookies.delete('access_token');
      response.cookies.delete('refreshToken');
      response.cookies.delete('refresh_token');
    }
    return response;
  }

  // If user has NO valid token (or refresh failed), redirect protected routes to sign-in
  if (!isAuthenticated) {
    const response = NextResponse.redirect(new URL('/auth/sign-in', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refreshToken');
    response.cookies.delete('refresh_token');
    return response;
  }

  // Extract user role string if payload is present
  if (payload) {
    const userRole =
      typeof payload.role === 'object' && payload.role?.id
        ? roleMap[payload.role.id]
        : roleMap[payload.role] || payload.role;

    // Check role-based route access
    for (const [route, roles] of Object.entries(roleRouteMap)) {
      if (pathname.startsWith(route) && !roles.includes(userRole)) {
        const redirectUrl = new URL('/dashboard/overview', request.url);
        const response = NextResponse.redirect(redirectUrl);
        if (isRefreshed && token) {
          response.cookies.set('access_token', token, {
            path: '/',
            maxAge: 24 * 60 * 60,
            sameSite: 'lax'
          });
          if (newRefreshToken) {
            response.cookies.set('refreshToken', newRefreshToken, {
              path: '/',
              maxAge: 30 * 24 * 60 * 60,
              sameSite: 'lax'
            });
          }
        }
        return response;
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (isRefreshed && token) {
    requestHeaders.set(
      'cookie',
      `access_token=${token}; refreshToken=${newRefreshToken || refreshToken || ''}`
    );
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  if (isRefreshed && token) {
    response.cookies.set('access_token', token, {
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax'
    });
    if (newRefreshToken) {
      response.cookies.set('refreshToken', newRefreshToken, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        sameSite: 'lax'
      });
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


