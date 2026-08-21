import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/use-auth-store';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const AUTH_EXCLUDED_URLS = [
  '/api/v1/auth/email/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/register'
];

function isAuthExcluded(url?: string): boolean {
  if (!url) return false;
  return AUTH_EXCLUDED_URLS.some((path) => url.includes(path));
}

function getStoredAccessToken(): string | undefined {
  let token: string | undefined = undefined;
  if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
    token = useAuthStore.getState()?.accessToken || undefined;
  }
  if (typeof document !== 'undefined') {
    const matchToken = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
    if (matchToken) {
      token = decodeURIComponent(matchToken[1]);
    }
  }
  return token;
}

function getStoredRefreshToken(): string | undefined {
  let refreshToken: string | undefined = undefined;
  if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
    refreshToken = useAuthStore.getState()?.refreshToken || undefined;
  }
  if (typeof document !== 'undefined') {
    const matchRefresh = document.cookie.match(/(?:^|; )refreshToken=([^;]*)/);
    if (matchRefresh) {
      refreshToken = decodeURIComponent(matchRefresh[1]);
    }
  }
  return refreshToken;
}

function isTokenExpired(token: string, bufferSeconds = 10): boolean {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + bufferSeconds * 1000;
  } catch {
    return true;
  }
}

// Single In-Flight Promise (Mutex Lock) for token refresh
let refreshPromise: Promise<string> | null = null;

export async function executeTokenRefresh(): Promise<string> {
  // If a refresh is already in flight, return the existing Promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`
      };

      // Use raw axios to prevent infinite interceptor loops
      const { data } = await axios.post(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers
        }
      );

      const payload = data?.data || data || {};
      const newToken =
        payload.token ||
        payload.access_token ||
        data?.token ||
        data?.access_token;
      const newRefreshToken =
        payload.refreshToken ||
        payload.refresh_token ||
        data?.refreshToken ||
        data?.refresh_token;

      if (!newToken) {
        throw new Error('Refresh response missing access token');
      }

      // Update Zustand Auth Store
      if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
        useAuthStore.getState().setAccessToken(newToken, newRefreshToken);
      }

      // Sync Cookies for SSR / Next.js Proxy
      if (typeof document !== 'undefined') {
        document.cookie = `access_token=${newToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
        if (newRefreshToken) {
          document.cookie = `refreshToken=${newRefreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        }
      }

      return newToken;
    } catch (refreshError) {
      // Clear auth state on definitive refresh failure
      if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
        useAuthStore.getState().logout();
      }
      if (typeof document !== 'undefined') {
        document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
      }

      // Redirect to sign-in if in browser and not already on auth page
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/auth')
      ) {
        window.location.href = '/auth/sign-in';
      }

      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Attach access token (with proactive refresh check & mutex wait) to every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isAuthExcluded(config.url)) {
    return config;
  }

  // If a refresh is currently running, wait for it before dispatching this request
  if (refreshPromise) {
    try {
      const freshToken = await refreshPromise;
      config.headers.Authorization = `Bearer ${freshToken}`;
      return config;
    } catch {
      // If refresh fails, proceed without token and let response interceptor / route guard handle
      return config;
    }
  }

  let token = getStoredAccessToken();
  const refreshToken = getStoredRefreshToken();

  // Proactive Refresh: If access token is expired or within 10s of expiry, refresh first
  if (token && isTokenExpired(token) && refreshToken) {
    try {
      token = await executeTokenRefresh();
    } catch {
      // Refresh failed, proceed and let 401 handler manage logout
    }
  }

  // Sync token back to useAuthStore if read from cookie
  const storeToken = useAuthStore.getState().accessToken;
  if (token && token !== storeToken) {
    useAuthStore.getState().setAccessToken(token, refreshToken);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor (fallback for 401 errors with single in-flight retry)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || isAuthExcluded(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await executeTokenRefresh();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
