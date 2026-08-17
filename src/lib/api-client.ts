import axios from 'axios';
import { useAuthStore } from '@/stores/use-auth-store';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  let token = useAuthStore.getState().accessToken;
  if (!token && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken && typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|; )refreshToken=([^;]*)/);
          if (match) {
            refreshToken = decodeURIComponent(match[1]);
          }
        }

        const headers: Record<string, string> = {};
        if (refreshToken) {
          headers.Authorization = `Bearer ${refreshToken}`;
        }

        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers
          }
        );

        const newToken = data?.token || data?.access_token || data?.data?.token || data?.data?.access_token;
        const newRefreshToken = data?.refreshToken || data?.refresh_token || data?.data?.refreshToken;

        if (!newToken) {
          throw new Error('Refresh response missing token');
        }

        useAuthStore.getState().setAccessToken(newToken, newRefreshToken);
        if (typeof document !== 'undefined') {
          document.cookie = `access_token=${newToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
          if (newRefreshToken) {
            document.cookie = `refreshToken=${newRefreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
          }
        }

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        if (typeof document !== 'undefined') {
          document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
          window.location.href = '/auth/sign-in';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
