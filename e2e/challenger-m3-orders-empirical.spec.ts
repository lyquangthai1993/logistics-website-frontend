import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Challenger 1 Empirical Suite: Orders Intake & Dispatch Stress Tests', () => {
  const dispatcherUser = TEST_USERS.find((u) => u.role === 'DISPATCHER')!;
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, dispatcherUser);
  });

  test('Test 1: URL Search Params Stress Testing (Extreme & Malformed values)', async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1.1 Injected corrupt search params
    await page.goto(
      '/dashboard/orders?page=-5&perPage=99999&search=%3Cscript%3Ealert(1)%3C/script%3E&status=INVALID_STATUS_XYZ&preset=corrupted_preset&sort=invalid_json'
    );
    await page.waitForLoadState('networkidle');

    // Page must render without crashing
    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible({
      timeout: 10000
    });
    await expect(page.locator('table')).toBeVisible();

    // 1.2 Extreme page number beyond dataset
    await page.goto('/dashboard/orders?page=99999');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Filter out expected 404/API errors from console logs if any, but ensure React didn't crash
    const reactCrash = consoleErrors.some(
      (e) => e.includes('Minified React error') || e.includes('Uncaught Error')
    );
    expect(reactCrash).toBe(false);
  });

  test('Test 2: Date Preset Switching & Custom Date Range Edge Cases', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    // 2.1 Click "Hôm nay"
    await page.click('button:has-text("Hôm nay")');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/preset=today/);

    // 2.2 Click "7 ngày qua"
    await page.click('button:has-text("7 ngày qua")');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/preset=7days/);

    // 2.3 Click "Tháng trước"
    await page.click('button:has-text("Tháng trước")');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/preset=lastMonth/);

    // 2.4 Click "Tháng này" (default preset: nuqs omits preset param, keeping fromDate/toDate)
    await page.click('button:has-text("Tháng này")');
    await page.waitForTimeout(400);
    const url = page.url();
    expect(url).not.toContain('preset=lastMonth');

    // 2.5 Inverted Date Range via URL
    await page.goto('/dashboard/orders?preset=custom&fromDate=2026-12-31&toDate=2026-01-01');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test 3: Search Query Edge Cases & Vietnamese Diacritics', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Tìm theo mã đơn"]').first();
    await expect(searchInput).toBeVisible();

    // 3.1 Vietnamese search
    await searchInput.fill('Linh kiện');
    await page.waitForTimeout(600);
    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible();

    // 3.2 Special characters and symbols
    await searchInput.fill('!@#$%^&*()_+{}[]:;"\'<>,.?/~`');
    await page.waitForTimeout(600);
    await expect(page.getByRole('heading', { name: 'Lập Lệnh Điều Vận' })).toBeVisible();

    // 3.3 Clear search and restore
    await searchInput.fill('');
    await page.waitForTimeout(600);
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test 4: Order Creation Validation & Auto Code Generation', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    // 4.1 Open Create Dialog
    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    const dialog = page.getByRole('dialog', { name: 'Tạo Lệnh Điều Vận Mới' });
    await expect(dialog).toBeVisible();

    // 4.2 Test Auto-Code Generation
    const autoCodeBtn = page.locator('button:has-text("Tự động sinh mã")');
    await autoCodeBtn.click();
    await page.waitForTimeout(1000);

    const orderCodeVal = await page.inputValue('#order-code-input');
    expect(orderCodeVal.length).toBeGreaterThan(5);

    // 4.3 External Fleet checkbox toggle and required note validation
    const externalCheckbox = page.locator('#isExternalNeeded');
    await externalCheckbox.check();
    await expect(page.locator('#external-note-input')).toBeVisible();

    // Uncheck
    await externalCheckbox.uncheck();
    await expect(page.locator('#external-note-input')).not.toBeVisible();

    // Close modal
    await page.click('button:has-text("Hủy bỏ")');
    await expect(dialog).not.toBeVisible();
  });

  test('Test 5: Full Order Intake, Edit, and Submit to Fleet Flow', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    const uniqueCode = `ORD${Date.now().toString().slice(-5)}`;

    // Create Draft Order
    await page.click('button:has-text("Tạo lệnh điều vận mới")');
    await page.fill('#order-code-input', uniqueCode);
    await page.fill('#total-weight-input', '12500');
    await page.fill('#total-volume-input', '32.5');
    await page.fill('#goods-desc-input', 'Hàng linh kiện điện tử kiểm thử');

    const createPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/orders') && res.request().method() === 'POST' && res.status() === 201
    );
    await page.click('button[type="submit"]:has-text("Lưu & Tạo lệnh")');
    await createPromise;

    // Verify row in table
    const orderLink = page.locator(`text=${uniqueCode}`).first();
    await expect(orderLink).toBeVisible({ timeout: 10000 });

    const row = page.locator('tr', { hasText: uniqueCode });
    await expect(row.locator('text=Nháp')).toBeVisible();

    // Submit to fleet
    const sendFleetBtn = row.locator('button:has-text("Gửi Fleet")');
    await sendFleetBtn.click();

    // Verify instant status transition to "Chờ điều xe"
    await expect(row.locator('text=Chờ điều xe')).toBeVisible({ timeout: 10000 });
  });

  test('Test 6: Status Filter Switching & Table Pagination', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    // 6.1 Status filter dropdown in toolbar
    const statusFilterBtn = page.locator(
      'button[data-slot="popover-trigger"]:has-text("Trạng thái")'
    );
    if (await statusFilterBtn.isVisible()) {
      await statusFilterBtn.click();
      await page.waitForTimeout(300);
      const draftOption = page
        .locator('[role="option"], [role="menuitemcheckbox"], label', { hasText: 'Chờ điều xe' })
        .first();
      if (await draftOption.isVisible()) {
        await draftOption.click();
        await page.waitForTimeout(500);
      }
    }

    // 6.2 Rows per page selector
    const rowsPerPage = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /10|20|30|40|50/ });
    if (await rowsPerPage.isVisible()) {
      await rowsPerPage.click();
      const option20 = page.locator('[role="option"]', { hasText: '20' });
      if (await option20.isVisible()) {
        await option20.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/perPage=20/);
      }
    }
  });
});
