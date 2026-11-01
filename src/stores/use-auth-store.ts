'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'DISPATCHER' | 'FLEET_MANAGER' | 'WAREHOUSE_MANAGER';

export interface User {
  id: string | number;
  username?: string | null;
  name: string;
  email: string;
  role: UserRole;
  hubId?: string | number | null;
  hub?: { id?: number | string; name?: string; code?: string; orderCodePrefix?: string } | null;
  warehouseId?: string;
  avatarUrl?: string;
  photo?: { id: string; path: string } | null;
  firstName?: string;
  lastName?: string;
}

export interface ImpersonatorSession {
  user: User;
  accessToken: string;
  refreshToken: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  impersonator: ImpersonatorSession | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken?: string | null) => void;
  setAccessToken: (token: string, refreshToken?: string | null) => void;
  startImpersonation: (
    targetUser: User,
    targetAccessToken: string,
    targetRefreshToken?: string | null
  ) => void;
  stopImpersonation: () => ImpersonatorSession | null;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      impersonator: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken = null) =>
        set({
          user,
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
          isAuthenticated: true
        }),

      setAccessToken: (accessToken, refreshToken = null) =>
        set((state) => ({ accessToken, refreshToken: refreshToken || state.refreshToken })),

      startImpersonation: (targetUser, targetAccessToken, targetRefreshToken = null) =>
        set((state) => {
          const existingImpersonator =
            state.impersonator ||
            (state.user && state.accessToken
              ? {
                  user: state.user,
                  accessToken: state.accessToken,
                  refreshToken: state.refreshToken
                }
              : null);

          return {
            impersonator: existingImpersonator,
            user: targetUser,
            accessToken: targetAccessToken,
            refreshToken: targetRefreshToken,
            isAuthenticated: true
          };
        }),

      stopImpersonation: () => {
        const currentImpersonator = get().impersonator;
        if (!currentImpersonator) return null;
        set({
          user: currentImpersonator.user,
          accessToken: currentImpersonator.accessToken,
          refreshToken: currentImpersonator.refreshToken,
          impersonator: null,
          isAuthenticated: true
        });
        return currentImpersonator;
      },

      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          impersonator: null,
          isAuthenticated: false
        }),

      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        impersonator: state.impersonator,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
