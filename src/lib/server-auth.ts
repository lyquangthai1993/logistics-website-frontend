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
