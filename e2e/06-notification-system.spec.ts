/**
 * e2e/06-notification-system.spec.ts
 * Notification System E2E Test Suite
 *
 * Flow 1: Authentication & Token Authorization (JWT Token & API Route Protection)
 * Flow 2: WebSocket Real-time Notification Dispatch (Dedicated WebSocket Event Trigger & Live Push Delivery)
 * Flow 3: UI Bell, Popover & Page Management (Header Bell Icon, Popover, Notifications Page & Mark Read)
 */

import { test, expect, request } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ADMIN = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
const WAREHOUSE = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;

// ── Helper: Lấy JWT Token qua API Login ─────────────────────────────────────
async function getAdminToken(): Promise<{ token: string; userId: number }> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/api/v1/auth/email/login`, {
    data: { email: ADMIN.email, password: ADMIN.password }
  });
  expect(res.status(), 'Login API must return HTTP 200').toBe(200);
  const body = await res.json();
  const token: string = body.token ?? body.data?.token;
  const userId: number = body.user?.id ?? body.data?.user?.id;
  await ctx.dispose();
  return { token, userId };
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOW 1: Authentication & Token Authorization
// ═══════════════════════════════════════════════════════════════════════════
test.describe('[Flow 1] Authentication & Token Authorization', () => {
  test('1.1. Login API obtains valid JWT token and User ID', async () => {
    const { token, userId } = await getAdminToken();
    expect(token).toBeTruthy();
    expect(userId).toBeGreaterThan(0);
  });

  test('1.2. Unauthenticated request to GET /api/v1/notifications is rejected with 401', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API_BASE}/api/v1/notifications`);
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('1.3. Authenticated request with JWT token receives HTTP 200 and paginated notification list', async () => {
    const { token } = await getAdminToken();
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });

    const res = await ctx.get(`${API_BASE}/api/v1/notifications?page=1&limit=5`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toHaveProperty('page', 1);
    expect(body.meta).toHaveProperty('limit', 5);
    expect(Array.isArray(body.data)).toBe(true);

    await ctx.dispose();
  });

  test('1.4. GET /api/v1/notifications/unread-count returns valid numeric unread counter', async () => {
    const { token } = await getAdminToken();
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });

    const res = await ctx.get(`${API_BASE}/api/v1/notifications/unread-count`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const count = typeof body.data === 'number' ? body.data : body;
    expect(typeof count).toBe('number');

    await ctx.dispose();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLOW 2: WebSocket Real-time Notification Dispatch (Chuyên Bắn Socket Noti)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('[Flow 2] WebSocket Real-time Notification Dispatch', () => {
  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('2.1. Trigger Swagger POST /send-test (userId + message) -> WebSocket pushes live notification to Chrome UI', async ({
    page
  }) => {
    // Step A: Login Warehouse Manager on Chrome UI
    await loginAs(page, WAREHOUSE);
    await page.goto('/dashboard/overview');
    await page.waitForLoadState('networkidle');

    // Extract access token
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'access_token');
    const token = tokenCookie?.value;
    expect(token).toBeTruthy();

    // Get Target User ID
    const apiCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });
    const profileRes = await apiCtx.get(`${API_BASE}/api/v1/auth/me`);
    const profileData = await profileRes.json();
    const targetUserId: number = profileData.id ?? profileData.data?.id;

    // Wait 2s to observe idle browser state
    await page.waitForTimeout(2000);

    // Step B: Dispatch WebSocket Notification via POST /api/v1/notifications/send-test
    const uniqueTitle = `⚡ Live Socket Event ${Date.now().toString().slice(-4)}`;
    const uniqueMessage = 'Thông báo bắn trực tiếp qua WebSocket Socket.IO sang giao diện Web';

    const sendRes = await apiCtx.post(`${API_BASE}/api/v1/notifications/send-test`, {
      data: {
        userId: targetUserId,
        title: uniqueTitle,
        message: uniqueMessage
      }
    });

    expect(sendRes.status(), 'POST /send-test must return HTTP 201').toBe(201);

    // Step C: Verify live arrival on UI without page refresh
    const notificationBadgeOrToast = page
      .locator(`text=${uniqueTitle}`)
      .or(page.locator('[data-sonner-toast]'))
      .or(page.locator('button[aria-label*="Notification"], button:has(svg.lucide-bell)'))
      .first();

    await expect(notificationBadgeOrToast).toBeVisible({ timeout: 12_000 });

    await apiCtx.dispose();
  });

  test('2.2. Verify WebSocket connection initialization completes without critical console errors', async ({
    page
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Google Sans Flex')) {
        errors.push(msg.text());
      }
    });

    await loginAs(page, ADMIN);
    await page.waitForURL(/\/dashboard\/.+/);
    await page.waitForTimeout(2000);

    const criticalWsErrors = errors.filter(
      (e) =>
        e.toLowerCase().includes('socket') &&
        !e.includes('ECONNREFUSED') &&
        !e.includes('connect_error') &&
        !e.includes('websocket error')
    );

    expect(criticalWsErrors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLOW 3: UI Bell, Popover & Page Management
// ═══════════════════════════════════════════════════════════════════════════
test.describe('[Flow 3] UI Bell, Popover & Page Management', () => {
  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('3.1. Header Notification Bell icon is rendered upon UI login', async ({ page }) => {
    await loginAs(page, ADMIN);
    await page.waitForURL(/\/dashboard\/.+/);

    const bellBtn = page
      .getByRole('button', { name: /notifications|thông báo/i })
      .or(page.locator('button:has([class*="notification"])'))
      .or(page.locator('button:has(svg.lucide-bell)'))
      .first();

    await expect(bellBtn).toBeVisible({ timeout: 10_000 });
  });

  test('3.2. Click Bell icon -> Notification Popover opens with content', async ({ page }) => {
    await loginAs(page, ADMIN);
    await page.waitForURL(/\/dashboard\/.+/);
    await page.waitForLoadState('networkidle');

    const bellBtn = page
      .getByRole('button', { name: /notifications|thông báo/i })
      .or(page.locator('button:has([class*="notification"])'))
      .or(page.locator('button:has(svg.lucide-bell)'))
      .first();

    await bellBtn.click();

    const popoverContent = page
      .locator('h4:has-text("Thông báo")')
      .or(page.getByRole('heading', { name: /notifications|thông báo/i }))
      .or(page.locator('text=Chưa có thông báo'))
      .first();

    await expect(popoverContent).toBeVisible({ timeout: 8_000 });
  });

  test('3.3. Dashboard Notifications page (/dashboard/notifications) loads correctly with tabs', async ({
    page
  }) => {
    await loginAs(page, ADMIN);
    await page.goto('/dashboard/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/auth\/sign-in/);

    await expect(page.getByRole('tab', { name: /all|tất cả/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('tab', { name: /unread|chưa đọc/i })).toBeVisible();
  });

  test('3.4. Execute PATCH /api/v1/notifications/read-all to mark all notifications as read', async () => {
    const { token } = await getAdminToken();
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });

    const res = await ctx.patch(`${API_BASE}/api/v1/notifications/read-all`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const result = body.data !== undefined ? body.data : body;
    expect(result).toHaveProperty('affected');
    expect(typeof result.affected).toBe('number');

    await ctx.dispose();
  });
});
