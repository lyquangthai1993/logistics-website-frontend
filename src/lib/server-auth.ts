/**
 * Server-side authentication and JWT validation helper functions.
 * Usable inside Server Components, Server Actions, and Route Handlers.
 */

export interface JwtPayload {
  id?: number | string;
  role?: string | number | { id: number; name: string };
  exp?: number;
  iat?: number;
  email?: string;
  [key: string]: unknown;
}

export function parseJwtServer(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token exists, is well-formed, and has not expired.
 * @param token Raw JWT string
 * @param bufferSeconds Buffer window in seconds (default 10s)
 */
export function isTokenValid(token?: string | null, bufferSeconds = 10): boolean {
  if (!token || typeof token !== 'string' || token.trim() === '' || token === 'undefined' || token === 'null') {
    return false;
  }

  const payload = parseJwtServer(token);
  if (!payload) return false;

  if (payload.exp && typeof payload.exp === 'number') {
    const expMs = payload.exp * 1000;
    const nowWithBuffer = Date.now() + bufferSeconds * 1000;
    if (expMs < nowWithBuffer) {
      return false;
    }
  }

  return true;
}

/**
 * Returns the default dashboard landing page for a given role.
 */
export function getRoleDefaultPath(role?: string | number | { id: number; name?: string } | null): string {
  let roleStr = '';
  if (typeof role === 'object' && role) {
    if (role.id === 1) roleStr = 'SUPER_ADMIN';
    else if (role.id === 2) roleStr = 'DISPATCHER';
    else if (role.id === 3) roleStr = 'FLEET_MANAGER';
    else if (role.id === 4) roleStr = 'WAREHOUSE_MANAGER';
    else roleStr = role.name || '';
  } else if (typeof role === 'number') {
    if (role === 1) roleStr = 'SUPER_ADMIN';
    else if (role === 2) roleStr = 'DISPATCHER';
    else if (role === 3) roleStr = 'FLEET_MANAGER';
    else if (role === 4) roleStr = 'WAREHOUSE_MANAGER';
  } else if (typeof role === 'string') {
    roleStr = role;
  }
  const upper = roleStr.toUpperCase();
  if (upper.includes('WAREHOUSE')) return '/dashboard/warehouse/orders';
  if (upper.includes('FLEET')) return '/dashboard/trips';
  if (upper.includes('DISPATCHER')) return '/dashboard/orders';
  return '/dashboard/orders';
}
