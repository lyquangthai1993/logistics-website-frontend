'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'SUPER_ADMIN' | 'DISPATCHER' | 'FLEET_MANAGER' | 'WAREHOUSE_MANAGER';

export interface User {
  id: string;
  username?: string | null;
  name: string;
  email: string;
  role: UserRole;
  warehouseId?: string;
  avatarUrl?: string;
  photo?: { id: string; path: string } | null;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken?: string | null) => void;
  setAccessToken: (token: string, refreshToken?: string | null) => void;
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

      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null
        })),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
