'use client';

/**
 * Client-side hook for filtering navigation items based on RBAC.
 *
 * Uses the Zustand auth store to check user roles for navigation visibility.
 * This is for UI filtering only — actual security is enforced by backend guards
 * and the Next.js middleware.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/use-auth-store';
import type { NavItem, NavGroup } from '@/types';

/**
 * Hook to filter navigation items based on RBAC (fully client-side)
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items
 */
export function useFilteredNavItems(items: NavItem[]) {
  const user = useAuthStore((s) => s.user);

  const accessContext = useMemo(() => {
    return {
      role: user?.role ?? undefined,
      hasUser: !!user
    };
  }, [user?.role, user]);

  // Filter items synchronously (all client-side)
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // No access restrictions
        if (!item.access) {
          return true;
        }

        // Check role
        if (item.access.role) {
          if (!accessContext.hasUser) {
            return false;
          }
          // Support single role or comma-separated roles
          const allowedRoles = item.access.role.split(',').map((r) => r.trim());
          if (!allowedRoles.includes(accessContext.role!)) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        // Recursively filter child items
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((childItem) => {
            if (!childItem.access) {
              return true;
            }

            if (childItem.access.role) {
              if (!accessContext.hasUser) {
                return false;
              }
              const allowedRoles = childItem.access.role.split(',').map((r) => r.trim());
              if (!allowedRoles.includes(accessContext.role!)) {
                return false;
              }
            }

            return true;
          });

          return {
            ...item,
            items: filteredChildren
          };
        }

        return item;
      });
  }, [items, accessContext]);

  return filteredItems;
}

/**
 * Hook to filter navigation groups based on RBAC (fully client-side)
 *
 * @param groups - Array of navigation groups to filter
 * @returns Filtered groups (empty groups are removed)
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some((gi) => gi.title === item.title && filteredSet.has(gi.title))
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filteredItems]);
}
