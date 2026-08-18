import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Hubs Management & Vehicle Relation (Super Admin & Fleet Manager)', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;
  const fleetManager = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('Super Admin can view, search and manage Hubs', async ({ page }) => {
    // 1. Login as SUPER_ADMIN
    await loginAs(page, superAdmin);

    // 2. Navigate to /dashboard/admin/hubs
    await page.goto('/dashboard/admin/hubs');
    await page.waitForLoadState('networkidle');

    // 3. Check page header
    const heading = page.locator('h2', { hasText: 'Quản Lý Chi Nhánh Kho' });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // 4. Verify table rendered hubs
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10_000 });

    // 5. Test search filter with seed hubs (resilient to pagination offset)
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill('Andromeda');
    await page.waitForTimeout(400);
    const hanRow = page.locator('tbody tr', { hasText: 'Andromeda Hub' });
    await expect(hanRow.first()).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('Đà Nẵng');
    await page.waitForTimeout(400);
    const dadRow = page.locator('tbody tr', { hasText: 'Magellan Hub' });
    await expect(dadRow.first()).toBeVisible({ timeout: 10_000 });

    // Clear search to restore full table
    await searchInput.fill('');
    await page.waitForTimeout(400);
    await expect(tableRows.first()).toBeVisible({ timeout: 10_000 });

    // 6. Test opening Add Hub Modal
    const addBtn = page.locator('#btn-add-hub');
    await addBtn.click();

    const dialog = page.locator('#hub-form-dialog');
    await expect(dialog).toBeVisible();

    // Fill form
    const uniqueCode = `HUB-E2E-${Date.now().toString().slice(-4)}`;
    await page.fill('#input-hub-code', uniqueCode);
    await page.fill('#input-hub-city', 'Hải Phòng');
    await page.fill('#input-hub-name', `Kho E2E Test ${uniqueCode}`);
    await page.fill('#input-hub-address', 'KCN Đình Vũ, Hải Phòng');
    await page.fill('#input-hub-manager', 'Tester E2E');
    await page.fill('#input-hub-phone', '0901234567');

    // Submit
    await page.click('button[type="submit"]:has-text("Thêm Chi Nhánh")');

    // Dialog should close and new hub should be listed (created with latest createdAt DESC)
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Search for the newly created hub to verify persistence & query invalidation
    await searchInput.fill(uniqueCode);
    await page.waitForTimeout(400);
    const createdRow = page.locator('tbody tr', { hasText: uniqueCode }).first();
    await expect(createdRow).toBeVisible({ timeout: 10_000 });

    // 7. Test Soft Delete action on the created hub
    const deleteBtn = createdRow.locator('button[aria-label="Xóa kho"]');
    await deleteBtn.click();

    const deleteConfirmDialog = page.locator('role=dialog', { hasText: 'Xác Nhận Xóa Mềm Chi Nhánh Kho' });
    await expect(deleteConfirmDialog).toBeVisible({ timeout: 5_000 });

    await page.click('button:has-text("Xác Nhận Xóa Mềm")');
    await expect(deleteConfirmDialog).not.toBeVisible({ timeout: 10_000 });

    // Verify row is removed from table (invalidation triggered)
    await expect(page.locator('tbody tr', { hasText: uniqueCode })).toHaveCount(0, { timeout: 10_000 });
  });

  test('FLEET_MANAGER is blocked from /dashboard/admin/hubs and can select Hub in fleet page', async ({
    page
  }) => {
    // 1. Login as FLEET_MANAGER
    await loginAs(page, fleetManager);

    // 2. Try to visit /dashboard/admin/hubs -> should redirect to /dashboard/overview
    await page.goto('/dashboard/admin/hubs');
    await page.waitForURL(/\/dashboard\/overview/, { timeout: 10_000 });

    // 3. Visit /dashboard/fleet
    await page.goto('/dashboard/fleet');
    await page.waitForLoadState('networkidle');

    // 4. Open Add Vehicle Modal
    const addVehicleBtn = page.locator('#btn-add-vehicle');
    await expect(addVehicleBtn).toBeVisible({ timeout: 10_000 });
    await addVehicleBtn.click();

    // 5. Check that Hub Select dropdown is present with options
    const hubSelect = page.locator('#select-current-hub');
    await expect(hubSelect).toBeVisible();

    const optionsCount = await hubSelect.locator('option').count();
    expect(optionsCount).toBeGreaterThan(1); // Should have placeholder + seeded active hubs
  });
});

