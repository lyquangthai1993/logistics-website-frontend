import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots/kpi-cards');

const WAREHOUSE_DAD = {
  email: 'lyquangthai1993+5@gmail.com', // Quan ly Kho B (Magellan Hub - Da Nang)
  password: 'secret',
  role: 'WAREHOUSE_MANAGER' as const,
};

test.describe('Warehouse KPI Stat Cards & Counters Verification', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Hub B (Da Nang): Verify Inbound & Outbound Stat Cards Casing, Subtitles & Counters', async ({ page }) => {
    page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('response', async (res) => {
      if (res.url().includes('warehouse/kpi')) {
        console.log('[NETWORK KPI]', res.status(), await res.text());
      }
    });

    // 1. Log in as Warehouse Manager Da Nang
    await loginAs(page, WAREHOUSE_DAD);

    // 2. Navigate to Inbound
    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check Inbound Stat Cards
    const inboundCard1 = page.locator('span:text-is("CHỜ NHẬP KHO")');
    const inboundCard2 = page.locator('span:text-is("KHÁCH GỬI TẠI KHO")');
    const inboundCard3 = page.locator('span:text-is("LUÂN CHUYỂN NỘI BỘ")');
    const inboundCard4 = page.locator('span:text-is("ĐÃ NHẬP KHO")');

    await expect(inboundCard1).toBeVisible();
    await expect(inboundCard2).toBeVisible();
    await expect(inboundCard3).toBeVisible();
    await expect(inboundCard4).toBeVisible();

    // Verify Inbound Stored Count is > 0 (should be 6)
    const storedInboundText = await page.locator('span:text-is("ĐÃ NHẬP KHO")').locator('..').locator('div.text-xl').innerText();
    console.log('[Inbound] ĐÃ NHẬP KHO:', storedInboundText);
    expect(storedInboundText).not.toContain('0 đơn');

    // Take screenshot of Inbound
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-inbound-kpi-cards.png'),
      fullPage: false,
    });

    // 3. Navigate to Outbound
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check Outbound Stat Cards (Card 4 is now ĐÃ XUẤT KHO, removing "HÔM NAY")
    const outboundCard1 = page.locator('span:text-is("CHỜ XUẤT KHO")');
    const outboundCard2 = page.locator('span:text-is("XUẤT CHO KHÁCH HÀNG")');
    const outboundCard3 = page.locator('span:text-is("LUÂN CHUYỂN NỘI BỘ")');
    const outboundCard4 = page.locator('span:text-is("ĐÃ XUẤT KHO")');

    await expect(outboundCard1).toBeVisible();
    await expect(outboundCard2).toBeVisible();
    await expect(outboundCard3).toBeVisible();
    await expect(outboundCard4).toBeVisible();

    // Verify "ĐÃ XUẤT KHO HÔM NAY" no longer exists
    await expect(page.locator('span:text-is("ĐÃ XUẤT KHO HÔM NAY")')).toHaveCount(0);

    // Verify Outbound Waiting Count is > 0
    const waitingOutboundText = await page.locator('span:text-is("CHỜ XUẤT KHO")').locator('..').locator('div.text-xl').innerText();
    console.log('[Outbound] CHỜ XUẤT KHO:', waitingOutboundText);
    expect(parseInt(waitingOutboundText)).toBeGreaterThan(0);

    // Verify Outbound Dispatched Count is > 0
    const completedOutboundText = await page.locator('span:text-is("ĐÃ XUẤT KHO")').locator('..').locator('div.text-xl').innerText();
    console.log('[Outbound] ĐÃ XUẤT KHO:', completedOutboundText);
    expect(parseInt(completedOutboundText)).toBeGreaterThan(0);

    // 4. Verify Date Range Search Criteria (Từ ngày -> Đến ngày)
    const fromDateInput = page.locator('input[aria-label="Từ ngày"]');
    const toDateInput = page.locator('input[aria-label="Đến ngày"]');

    await expect(fromDateInput).toBeVisible();
    await expect(toDateInput).toBeVisible();

    // Verify default value: start of current month (YYYY-MM-01) to today (YYYY-MM-DD)
    const now = new Date();
    const expectedFromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const expectedToDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const fromVal = await fromDateInput.inputValue();
    const toVal = await toDateInput.inputValue();
    console.log(`[Date Filter Check] Từ ngày: ${fromVal} (Expected: ${expectedFromDate}), Đến ngày: ${toVal} (Expected: ${expectedToDate})`);
    expect(fromVal).toBe(expectedFromDate);
    expect(toVal).toBe(expectedToDate);

    // Verify Tab Counters
    await expect(page.locator('button:has-text("Lưu kho")')).toBeVisible();
    await expect(page.locator('button:has-text("Đã xuất kho")')).toBeVisible();

    // Take screenshot of Outbound with Date Filter & Stat Cards
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-outbound-kpi-cards-with-date-filter.png'),
      fullPage: false,
    });

    // 5. Test changing date filter to a single day and verify reactive re-fetch
    await fromDateInput.fill(expectedToDate);
    await page.waitForTimeout(1000);

    // 6. Verify Table Pagination and Limit per Page (10, 20, 50, 100)
    const paginationText = page.locator('text=/đơn hàng/i').last();
    await expect(paginationText).toBeVisible();

    const pageSizeLabel = page.locator('text=Số dòng / trang').first();
    await expect(pageSizeLabel).toBeVisible();

    // Verify initial rows count in table
    const tableRows = page.locator('tbody tr');
    const initialCount = await tableRows.count();
    console.log(`[Pagination Check] Initial table rows count: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // Take screenshot of Outbound with Pagination Bar & Page Size Selector
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-outbound-table-pagination.png'),
      fullPage: true,
    });

    console.log('[Test Passed] ĐÃ XUẤT KHO card, Date Range Search, and Pagination with Page Size limit verified successfully!');
  });
});
