'use client';

import { useAuthStore, type User } from '@/stores/use-auth-store';
import axios from 'axios';

const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production' ? 'https://logistics-website-backend-1.onrender.com' : '';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  DEFAULT_API_URL
).replace(/\/+$/, '');

const AUTH_CHANNEL_NAME = 'tms_auth_sync_channel';

type AuthSyncMessage =
  | { type: 'AUTH_LOGIN'; accessToken: string; refreshToken?: string | null; user: User }
  | { type: 'AUTH_REFRESH'; accessToken: string; refreshToken?: string | null }
  | { type: 'AUTH_LOGOUT' };

class TokenManager {
  private channel: BroadcastChannel | null = null;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private refreshPromise: Promise<string> | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initChannel();
      this.initTabLifecycle();
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Sync cookies from localStorage if present
    const store = useAuthStore.getState();
    if (store.accessToken) {
      this.syncCookies(store.accessToken, store.refreshToken);
      this.scheduleSilentRefresh(store.accessToken);
    } else {
      // Or read from cookie and sync to store
      const cookieToken = this.getAccessToken();
      const cookieRefresh = this.getRefreshToken();
      if (cookieToken) {
        this.scheduleSilentRefresh(cookieToken);
      }
    }
  }

  private initChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
          this.handleChannelMessage(event.data);
        };
      } catch {
        // Fallback to storage event
      }
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'auth-storage') {
        try {
          const parsed = JSON.parse(event.newValue || '{}');
          const state = parsed.state;
          if (state?.accessToken) {
            this.syncCookies(state.accessToken, state.refreshToken);
            this.scheduleSilentRefresh(state.accessToken);
          } else if (state?.isAuthenticated === false) {
            this.clearCookies();
          }
        } catch {}
      }
    });
  }

  private initTabLifecycle() {
    const onWakeUp = () => {
      const token = this.getAccessToken();
      const refreshToken = this.getRefreshToken();
      if (!token && refreshToken) {
        this.refreshToken().catch(() => {});
      } else if (token && this.isTokenExpiringSoon(token, 60)) {
        this.refreshToken().catch(() => {});
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onWakeUp();
      }
    });

    window.addEventListener('focus', onWakeUp);
  }

  private handleChannelMessage(message: AuthSyncMessage) {
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
      case 'AUTH_LOGIN': {
        useAuthStore.getState().setAuth(message.user, message.accessToken, message.refreshToken);
        this.syncCookies(message.accessToken, message.refreshToken);
        this.scheduleSilentRefresh(message.accessToken);
        break;
      }
      case 'AUTH_REFRESH': {
        useAuthStore.getState().setAccessToken(message.accessToken, message.refreshToken);
        this.syncCookies(message.accessToken, message.refreshToken);
        this.scheduleSilentRefresh(message.accessToken);
        break;
      }
      case 'AUTH_LOGOUT': {
        useAuthStore.getState().logout();
        this.clearCookies();
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/sign-in';
        }
        break;
      }
    }
  }

  public getAccessToken(): string | undefined {
    let token: string | undefined = undefined;
    if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
      token = useAuthStore.getState()?.accessToken || undefined;
    }
    if (!token && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
      if (match) token = decodeURIComponent(match[1]);
    }
    return token;
  }

  public getRefreshToken(): string | undefined {
    let refreshToken: string | undefined = undefined;
    if (typeof window !== 'undefined' && typeof useAuthStore?.getState === 'function') {
      refreshToken = useAuthStore.getState()?.refreshToken || undefined;
    }
    if (!refreshToken && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )refreshToken=([^;]*)/);
      if (match) refreshToken = decodeURIComponent(match[1]);
    }
    return refreshToken;
  }

  public syncCookies(accessToken: string, refreshToken?: string | null) {
    if (typeof document === 'undefined') return;
    document.cookie = `access_token=${accessToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
    if (refreshToken) {
      document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }

  public clearCookies() {
    if (typeof document === 'undefined') return;
    document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'refresh_token=; path=/; max-age=0; SameSite=Lax';
  }

  public parseJwtExp(token: string): number | null {
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
      const payload = JSON.parse(jsonPayload);
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  public isTokenExpiringSoon(token: string, bufferSeconds = 30): boolean {
    const expMs = this.parseJwtExp(token);
    if (!expMs) return true;
    return expMs <= Date.now() + bufferSeconds * 1000;
  }

  public scheduleSilentRefresh(token: string) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    if (typeof window === 'undefined') return;

    const expMs = this.parseJwtExp(token);
    if (!expMs) return;

    const now = Date.now();
    const timeUntilExp = expMs - now;

    // Refresh when 75% of lifetime has elapsed (or 25s before expiry)
    const refreshDelay = Math.max(timeUntilExp - 25 * 1000, timeUntilExp * 0.75, 3000);

    this.refreshTimeout = setTimeout(() => {
      this.refreshToken().catch(() => {
        // Silent fail, reactive interceptor will retry on demand
      });
    }, refreshDelay);
  }

  public async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const currentRefreshToken = this.getRefreshToken();
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentRefreshToken}`
        };

        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true, headers, timeout: 30000 }
        );

        const payload = data?.data || data || {};
        const newToken = payload.token || payload.access_token || data?.token || data?.access_token;
        const newRefreshToken =
          payload.refreshToken ||
          payload.refresh_token ||
          data?.refreshToken ||
          data?.refresh_token;

        if (!newToken) {
          throw new Error('Refresh response missing access token');
        }

        // 1. Update Zustand
        useAuthStore.getState().setAccessToken(newToken, newRefreshToken);

        // 2. Update Cookies
        this.syncCookies(newToken, newRefreshToken);

        // 3. Broadcast to other tabs
        if (this.channel) {
          this.channel.postMessage({
            type: 'AUTH_REFRESH',
            accessToken: newToken,
            refreshToken: newRefreshToken
          });
        }

        // 4. Schedule next silent refresh
        this.scheduleSilentRefresh(newToken);

        return newToken;
      } catch (err: any) {
        const isAuthRejection =
          err?.response?.status === 401 ||
          err?.response?.status === 403 ||
          err?.message?.includes('Revoked') ||
          err?.message?.includes('Refresh') ||
          err?.message === 'No refresh token available';

        // ONLY trigger hard logout if the backend explicitly rejected credentials
        if (isAuthRejection) {
          useAuthStore.getState().logout();
          this.clearCookies();
          if (this.channel) {
            this.channel.postMessage({ type: 'AUTH_LOGOUT' });
          }
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
            window.location.href = '/auth/sign-in';
          }
        }

        throw err;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public notifyLogin(user: User, accessToken: string, refreshToken?: string | null) {
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);
    this.syncCookies(accessToken, refreshToken);
    this.scheduleSilentRefresh(accessToken);

    if (this.channel) {
      this.channel.postMessage({
        type: 'AUTH_LOGIN',
        user,
        accessToken,
        refreshToken
      });
    }
  }

  public notifyLogout() {
    useAuthStore.getState().logout();
    this.clearCookies();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

    if (this.channel) {
      this.channel.postMessage({ type: 'AUTH_LOGOUT' });
    }
  }
}

export const tokenManager = new TokenManager();
