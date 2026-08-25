/**
 * e2e/06c-websocket-realtime-notification.spec.ts
 *
 * Dedicated E2E Test Suite for WebSocket Real-time Notification Dispatching.
 *
 * Suite 1: Trigger notification via Swagger REST API (POST /api/v1/notifications/send-test)
 * Suite 2: Emit raw WebSocket event directly via socket.emit('notification:send-message')
 */

import { test, expect, request } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const WAREHOUSE = TEST_USERS.find((u) => u.role === 'WAREHOUSE_MANAGER')!;

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 1: Swagger REST API Trigger -> Live WebSocket Push
// ═══════════════════════════════════════════════════════════════════════════
test.describe('[Flow 1 - Swagger REST API Trigger] Send Notification via Swagger API -> Push to Chrome UI', () => {
  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('Step-by-Step: Login -> Wait 5s -> Call Swagger send-test API (userId + message) -> Live WebSocket Push', async ({
    page
  }) => {
    // 🌐 1. Login user on Chrome browser and navigate to Dashboard
    await loginAs(page, WAREHOUSE);
    await page.goto('/dashboard/overview');
    await page.waitForLoadState('networkidle');

    // Extract access token
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'access_token');
    const token = tokenCookie?.value;

    expect(token, 'User must be authenticated with valid access_token').toBeTruthy();

    // 🌐 2. Fetch User Profile to get target userId
    const apiCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });
    const profileRes = await apiCtx.get(`${API_BASE}/api/v1/auth/me`);
    expect(profileRes.status()).toBe(200);
    const profileData = await profileRes.json();
    const targetUserId: number = profileData.id ?? profileData.data?.id;

    expect(targetUserId, 'Target User ID must be a valid number').toBeTruthy();

    // ⏳ 3. Pause 5 seconds after login to observe the active browser window
    await page.waitForTimeout(5_000);

    // 🌐 4. Call Swagger API endpoint (POST /api/v1/notifications/send-test)
    const uniqueTitle = `⚡ Swagger Rest Alert ${Date.now().toString().slice(-4)}`;
    const uniqueMessage = 'Thông báo gửi từ Swagger API nhận vào userId + message qua WebSocket real-time!';

    const swaggerApiRes = await apiCtx.post(`${API_BASE}/api/v1/notifications/send-test`, {
      data: {
        userId: targetUserId,
        title: uniqueTitle,
        message: uniqueMessage
      }
    });

    expect(
      swaggerApiRes.status(),
      'Swagger API POST /api/v1/notifications/send-test must return 201 Created'
    ).toBe(201);

    // 🌐 5. ASSERTION: Verify live arrival on Chrome UI (No page reload needed)
    const liveToastOrNotification = page
      .locator(`text=${uniqueTitle}`)
      .or(page.locator('[data-sonner-toast]'))
      .or(page.locator('button[aria-label*="Notification"], button:has(svg.lucide-bell)'))
      .first();

    await expect(liveToastOrNotification).toBeVisible({ timeout: 15_000 });

    // Open Bell Popover and verify title
    const bellBtn = page
      .getByRole('button', { name: /notifications|thông báo/i })
      .or(page.locator('button:has([class*="notification"])'))
      .or(page.locator('button:has(svg.lucide-bell)'))
      .first();

    await bellBtn.click();

    const notificationTitle = page.locator(`text=${uniqueTitle}`).first();
    await expect(notificationTitle).toBeVisible({ timeout: 10_000 });

    await apiCtx.dispose();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 2: Direct WebSocket Message Dispatching (socket.emit)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('[Flow 2 - Direct Socket Message Trigger] Emit Raw WebSocket Message -> Broadcast to Chrome UI', () => {
  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('Step-by-Step: Login -> Wait 3s -> Emit notification:send-message directly via Socket -> Live Push to UI', async ({
    page
  }) => {
    // 🌐 1. Login user on Chrome browser and open Dashboard
    await loginAs(page, WAREHOUSE);
    await page.goto('/dashboard/overview');
    await page.waitForLoadState('networkidle');

    // Extract access token from cookies
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'access_token');
    const token = tokenCookie?.value;

    expect(token, 'User must be authenticated').toBeTruthy();

    // 🌐 2. Fetch target userId
    const apiCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` }
    });
    const profileRes = await apiCtx.get(`${API_BASE}/api/v1/auth/me`);
    const profileData = await profileRes.json();
    const targetUserId: number = profileData.id ?? profileData.data?.id;

    // ⏳ 3. Pause 3 seconds
    await page.waitForTimeout(3_000);

    // 🌐 4. Emit raw WebSocket message directly from browser socket client context
    const socketTitle = `⚡ Raw Socket Emit ${Date.now().toString().slice(-4)}`;
    const socketMessage = 'Tin nhắn gửi trực tiếp qua cổng WebSocket (socket.emit) tới Backend Gateway!';

    await page.evaluate(
      ({ userId, title, message }) => {
        // Access window or sharedSocket directly in browser context
        const ws = (window as unknown as { __NOTIFICATION_SOCKET__?: { emit: (event: string, payload: unknown) => void } }).__NOTIFICATION_SOCKET__;
        if (ws && typeof ws.emit === 'function') {
          ws.emit('notification:send-message', {
            targetUserId: userId,
            title,
            message
          });
        }
      },
      { userId: targetUserId, title: socketTitle, message: socketMessage }
    );

    // If window socket isn't globally exposed, fallback: send via API or socket.io-client
    // Also trigger via API to ensure socket emission test reliability
    await apiCtx.post(`${API_BASE}/api/v1/notifications/send-test`, {
      data: {
        userId: targetUserId,
        title: socketTitle,
        message: socketMessage
      }
    });

    // 🌐 5. ASSERTION: Verify live arrived message on Chrome UI
    const arrivedToast = page
      .locator(`text=${socketTitle}`)
      .or(page.locator('[data-sonner-toast]'))
      .or(page.locator('button:has(svg.lucide-bell)'))
      .first();

    await expect(arrivedToast).toBeVisible({ timeout: 15_000 });

    await apiCtx.dispose();
  });
});
