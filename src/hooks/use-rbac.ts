'use client';

import { useAuthStore, type UserRole } from '@/stores/use-auth-store';

/**
 * Hook for role-based access control checks.
 *
 * Usage:
 * ```tsx
 * const { hasRole, isSuperAdmin } = useRBAC();
 * if (hasRole('DISPATCHER', 'SUPER_ADMIN')) { ... }
 * ```
 */
export function useRBAC() {
  const user = useAuthStore((s) => s.user);

  const hasRole = (...roles: UserRole[]) => (user ? roles.includes(user.role) : false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDispatcher = hasRole('SUPER_ADMIN', 'DISPATCHER');
  const isFleetManager = hasRole('SUPER_ADMIN', 'FLEET_MANAGER');
  const isWarehouseManager = hasRole('SUPER_ADMIN', 'WAREHOUSE_MANAGER');

  return {
    user,
    hasRole,
    isSuperAdmin,
    isDispatcher,
    isFleetManager,
    isWarehouseManager
  };
}
