/**
 * e2e/03-rbac-routing.spec.ts
 * SUB-AGENT ROLE: RBAC Route Guard Validator
 *
 * Validates after login that:
 *   - Each role can access its permitted routes
 *   - Each role is BLOCKED from unauthorized routes (redirected to /dashboard/warehouse/orders)
 *   - Proxy correctly enforces roleRouteMap from src/proxy.ts
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

/**
 * Route access matrix – mirrors src/proxy.ts roleRouteMap
 * Format: { route, allowedRoles }
 */
const ROUTE_MATRIX = [
  { route: '/dashboard/admin', allowedRoles: ['SUPER_ADMIN'] },
  {
    route: '/dashboard/orders',
    allowedRoles: ['SUPER_ADMIN', 'DISPATCHER', 'FLEET_MANAGER', 'WAREHOUSE_MANAGER']
  },
  { route: '/dashboard/trips', allowedRoles: ['SUPER_ADMIN', 'FLEET_MANAGER'] },
  { route: '/dashboard/fleet', allowedRoles: ['SUPER_ADMIN', 'FLEET_MANAGER'] },
  { route: '/dashboard/warehouse', allowedRoles: ['SUPER_ADMIN', 'WAREHOUSE_MANAGER'] }
];

const CORE_ROLE_USERS = Array.from(new Map(TEST_USERS.map((u) => [u.role, u])).values());

for (const user of CORE_ROLE_USERS) {
  test.describe(`[RBAC] ${user.role} (${user.username}) – route access enforcement`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, user);
    });

    test.afterEach(async ({ page }) => {
      await clearSession(page);
    });

    for (const { route, allowedRoles } of ROUTE_MATRIX) {
      const isAllowed = allowedRoles.includes(user.role);

      test(`${isAllowed ? '✅ ALLOW' : '🚫 BLOCK'} ${user.role} → ${route}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');

        if (isAllowed) {
          // Should stay on the requested route (or sub-path)
          await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')), { timeout: 10000 });
        } else {
          // Should redirect away from unauthorized route
          await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')), {
            timeout: 10000
          });
          // Should land on default permitted landing page (not sign-in, since user IS authenticated)
          await expect(page).toHaveURL(/\/dashboard\/(orders|trips|warehouse\/orders)/, { timeout: 10000 });
        }
      });
    }
  });
}
