import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Challenger 1 Empirical Suite: Hubs Management Stress Tests', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/admin/hubs');
    await page.waitForLoadState('networkidle');
  });

  test('Test 1: Vietnamese diacritics & search filters', async ({ page }) => {
    const searchInput = page.locator('#hub-search-input');
    await expect(searchInput).toBeVisible();

    // 1. Search "Đà Nẵng"
    await searchInput.fill('Đà Nẵng');
    await page.waitForTimeout(600);
    const dadMatch = page.locator('tr', { hasText: 'Đà Nẵng' });
    await expect(dadMatch.first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Magellan Hub').first()).toBeVisible();

    // 2. Search "Hồ Chí Minh"
    await searchInput.fill('Hồ Chí Minh');
    await page.waitForTimeout(600);
    const sgnMatch = page.locator('tr', { hasText: 'TP. Hồ Chí Minh' });
    await expect(sgnMatch.first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Centaurus Hub').first()).toBeVisible();

    // 3. Search "Hà Nội"
    await searchInput.fill('Hà Nội');
    await page.waitForTimeout(600);
    const hanMatch = page.locator('tr', { hasText: 'Hà Nội' });
    await expect(hanMatch.first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Andromeda Hub').first()).toBeVisible();

    // 4. Empty search restoration
    await searchInput.fill('');
    await page.waitForTimeout(600);
    const allRows = page.locator('tbody tr');
    const count = await allRows.count();
    expect(count).toBeGreaterThan(1);
  });

  test('Test 2: Pagination bounds & rows-per-page selection', async ({ page }) => {
    // Check initial rows per page selector (combobox)
    const pagination = page
      .locator('[role="navigation"], .flex.items-center.justify-between')
      .filter({ hasText: 'Rows per page' });
    await expect(pagination).toBeVisible();

    // Change perPage to 20 or 50 if available
    const perPageSelect = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /10|20|30|40|50/ });
    if (await perPageSelect.isVisible()) {
      await perPageSelect.click();
      const option20 = page.locator('[role="option"]', { hasText: '20' });
      if (await option20.isVisible()) {
        await option20.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/perPage=20/);
      }
    }
  });

  test('Test 3: Query Invalidation Bug on Active Toggle', async ({ page }) => {
    // Find Magellan Hub
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill('Magellan Hub');
    await page.waitForTimeout(600);

    const hubRow = page.locator('tbody tr').first();
    await expect(hubRow).toBeVisible();

    const statusBadge = hubRow.locator('td:nth-child(6)');
    const initialStatus = (await statusBadge.innerText()).trim();

    // Click toggle active button
    const toggleBtn = hubRow.locator('button[aria-label="Bật/Tắt hoạt động kho"]');
    await toggleBtn.click();

    // Toast will appear
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    // Status badge SHOULD update automatically without full page reload
    const expectedStatus = initialStatus.includes('Hoạt Động') ? 'Tạm Ngưng' : 'Hoạt Động';
    await expect(statusBadge).toContainText(expectedStatus, { timeout: 4000 });
  });

  test('Test 4: Query Invalidation Bug on Hub Creation', async ({ page }) => {
    const addBtn = page.locator('#btn-add-hub');
    await addBtn.click();

    const dialog = page.locator('#hub-form-dialog');
    await expect(dialog).toBeVisible();

    const uniqueCode = `HUB-EMP-${Date.now().toString().slice(-4)}`;
    await page.fill('#input-hub-code', uniqueCode);
    await page.fill('#input-hub-city', 'Thái Nguyên');
    await page.fill('#input-hub-name', `Kho Test Empirical ${uniqueCode}`);
    await page.click('button[type="submit"]:has-text("Thêm Chi Nhánh")');

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify row appears without manual reload
    const createdRow = page.locator('tbody tr', { hasText: uniqueCode });
    await expect(createdRow).toBeVisible({ timeout: 4000 });
  });
});
