import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager, API_BASE_URL } from './token-manager';

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

export async function executeTokenRefresh(): Promise<string> {
  return tokenManager.refreshToken();
}

// Attach access token (with proactive refresh check & mutex wait) to every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isAuthExcluded(config.url)) {
    return config;
  }

  let token = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();

  // Proactive Refresh: If access token is expired or within 10s of expiry, refresh first
  if (token && tokenManager.isTokenExpiringSoon(token, 10) && refreshToken) {
    try {
      token = await tokenManager.refreshToken();
    } catch {
      // Refresh failed, proceed and let 401 handler manage logout
    }
  }

  // Sync token back to useAuthStore if read from cookie (Client-side only)
  if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
    const storeToken = useAuthStore.getState()?.accessToken;
    if (token && token !== storeToken) {
      useAuthStore.getState().setAccessToken(token, refreshToken);
    }
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

    if (
      !originalRequest ||
      isAuthExcluded(originalRequest.url) ||
      typeof window === 'undefined'
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenManager.refreshToken();
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
