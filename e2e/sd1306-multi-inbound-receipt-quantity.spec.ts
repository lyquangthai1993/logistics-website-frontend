import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_USERS, loginAs } from './helpers/auth';

const API_BASE = process.env.API_URL || 'http://localhost:4001/api/v1';
const USER_WAREHOUSE_HCM =
  TEST_USERS.find((u) => u.username === 'warehouse_hcm') || TEST_USERS[5];
const USER_ADMIN = TEST_USERS[0];

test.describe('Multi-Inbound Consolidated Order Receipt Quantity (SD1306 & SD1307 - PML2611-0128.A)', () => {
  test('API & UI: SD1306 displays 2 kiện and SD1307 displays 3 kiện on Phiếu Nhập Kho instead of cumulative 5 kiện', async ({
    page,
    request
  }) => {
    const loginRes = await request.post(`${API_BASE}/auth/email/login`, {
      data: {
        email: USER_ADMIN.email,
        password: USER_ADMIN.password
      },
      timeout: 15000
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const token = loginBody.token || loginBody.data?.token;
    expect(token).toBeTruthy();

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Verify GET /warehouse/inbound/receipt-data for SD1306 (2 kiện) & SD1307 (3 kiện)
    const sd1306Code = encodeURIComponent('SD1306');
    const sd1307Code = encodeURIComponent('SD1307');

    const receipt1306Res = await request.get(
      `${API_BASE}/warehouse/inbound/receipt-data?tripCode=${sd1306Code}`,
      { headers, timeout: 15000 }
    );
    expect(receipt1306Res.ok()).toBeTruthy();
    const receipt1306 = (await receipt1306Res.json()).data;
    expect(receipt1306.tripCode).toBe('SD1306');
    expect(receipt1306.totalQuantity).toBe(2);
    expect(receipt1306.items).toHaveLength(1);
    expect(receipt1306.items[0].orderCode).toBe('PML2611-0128.A');
    expect(receipt1306.items[0].quantity).toBe(2);

    const receipt1307Res = await request.get(
      `${API_BASE}/warehouse/inbound/receipt-data?tripCode=${sd1307Code}`,
      { headers, timeout: 15000 }
    );
    expect(receipt1307Res.ok()).toBeTruthy();
    const receipt1307 = (await receipt1307Res.json()).data;
    expect(receipt1307.tripCode).toBe('SD1307');
    expect(receipt1307.totalQuantity).toBe(3);
    expect(receipt1307.items).toHaveLength(1);
    expect(receipt1307.items[0].orderCode).toBe('PML2611-0128.A');
    expect(receipt1307.items[0].quantity).toBe(3);

    // 2. Verify GET /warehouse/inbound-trips returns trip-specific quantities for SD1306
    const trips1306Res = await request.get(
      `${API_BASE}/warehouse/inbound-trips?search=${sd1306Code}`,
      { headers, timeout: 15000 }
    );
    expect(trips1306Res.ok()).toBeTruthy();
    const trips1306Data = (await trips1306Res.json()).data;
    const trip1306Row = (trips1306Data?.data || trips1306Data || []).find(
      (r: any) => r.tripCode === 'SD1306'
    );
    expect(trip1306Row).toBeTruthy();
    expect(trip1306Row.totalQuantity).toBe(2);
    expect(trip1306Row.orders[0].orderCode).toBe('PML2611-0128.A');
    expect(trip1306Row.orders[0].tripInboundQuantity).toBe(2);
    expect(trip1306Row.orders[0].inboundQuantity).toBe(2);
    expect(trip1306Row.orders[0].totalQuantity).toBe(2);
    expect(trip1306Row.orders[0].orderTotalQuantity).toBe(5);

    // 3. Verify Browser UI as Warehouse HCM Operator (Andromeda Hub - HCM)
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, USER_WAREHOUSE_HCM);
    await page.goto('/dashboard/warehouse/inbound', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator(
      'input[placeholder*="Tìm mã chuyến"], input[placeholder*="mã đơn"]'
    );
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Search SD1306
    await searchInput.fill('SD1306');
    await searchInput.press('Enter');

    const sd1306Tr = page.locator('tbody tr', { hasText: 'SD1306' }).first();
    await expect(sd1306Tr).toBeVisible({ timeout: 15000 });
    await expect(sd1306Tr).toContainText('PML2611-0128.A');
    await expect(sd1306Tr).toContainText('2 kiện');

    const printBtn1306 = sd1306Tr.getByRole('button', { name: /In phiếu nhập/i });
    await expect(printBtn1306).toBeVisible();
    await printBtn1306.click();

    const receiptModal = page.locator('[role="dialog"]', {
      hasText: 'Phiếu Nhập Kho'
    });
    await expect(receiptModal).toBeVisible({ timeout: 10000 });
    await expect(receiptModal).toContainText('SD1306');
    await expect(receiptModal).toContainText('47H-11245');
    await expect(receiptModal).toContainText('PML2611-0128.A');

    const itemRow1306 = receiptModal.locator('tbody tr', {
      hasText: 'PML2611-0128.A'
    });
    await expect(itemRow1306).toBeVisible();
    // Column 4 is Số lượng -> must be 2, not 5
    const qtyCell1306 = itemRow1306.locator('td').nth(3);
    await expect(qtyCell1306).toHaveText('2');

    const totalRow1306 = receiptModal.locator('tbody tr', {
      hasText: 'Tổng cộng'
    });
    await expect(totalRow1306).toBeVisible();
    await expect(totalRow1306.locator('td').nth(1)).toHaveText('2');

    // Save verified screenshot evidence
    const screenshotDir = path.resolve(process.cwd(), 'e2e', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(
      screenshotDir,
      'sd1306-inbound-receipt-verified.png'
    );
    await receiptModal.screenshot({ path: screenshotPath });
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(5000);

    // Close modal and check SD1307 (3 kiện)
    const closeBtn = receiptModal.getByRole('button', { name: /Đóng/i });
    await closeBtn.click();
    await expect(receiptModal).toBeHidden({ timeout: 5000 });

    await searchInput.fill('SD1307');
    await searchInput.press('Enter');

    const sd1307Tr = page.locator('tbody tr', { hasText: 'SD1307' }).first();
    await expect(sd1307Tr).toBeVisible({ timeout: 15000 });
    await expect(sd1307Tr).toContainText('3 kiện');

    const printBtn1307 = sd1307Tr.getByRole('button', { name: /In phiếu nhập/i });
    await printBtn1307.click();

    await expect(receiptModal).toBeVisible({ timeout: 10000 });
    await expect(receiptModal).toContainText('SD1307');
    const itemRow1307 = receiptModal.locator('tbody tr', {
      hasText: 'PML2611-0128.A'
    });
    await expect(itemRow1307.locator('td').nth(3)).toHaveText('3');
    const totalRow1307 = receiptModal.locator('tbody tr', {
      hasText: 'Tổng cộng'
    });
    await expect(totalRow1307.locator('td').nth(1)).toHaveText('3');
  });
});
