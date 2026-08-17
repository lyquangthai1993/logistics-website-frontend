/**
 * e2e/04-fleet-crud-and-refresh.spec.ts
 * E2E Playwright test suite for Fleet Management ("Quản lý đội xe") & Refresh Token Rotation
 */
import { test, expect } from '@playwright/test';
import { loginAs, clearSession, TEST_USERS } from './helpers/auth';

const fleetUser = TEST_USERS.find((u) => u.role === 'FLEET_MANAGER') ?? {
  email: 'fleet@spiderexpress.vn',
  password: 'secret',
  role: 'FLEET_MANAGER' as const,
};

test.describe('[Fleet Management] CRUD Operations & Refresh Token', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await loginAs(page, fleetUser);
    await page.goto('/dashboard/fleet');
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({ page }) => {
    await clearSession(page);
  });

  test('1. Renders Fleet Dashboard & Seeded Data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Quản Lý Đội Xe/i })).toBeVisible({ timeout: 10_000 });
    // Check seeded vehicle
    await expect(page.locator('table')).toContainText('75H-051.21', { timeout: 10_000 });
    await expect(page.locator('table')).toContainText('43H-212.48', { timeout: 10_000 });
  });

  test('2. Vehicle CRUD: Create, Edit, Delete', async ({ page }) => {
    const testLicensePlate = `75H-${Math.floor(100.0 + Math.random() * 899.0)}.99`;

    // CREATE
    await page.click('#btn-add-vehicle');
    await page.waitForSelector('#vehicle-form-dialog');
    await page.fill('#input-license-plate', testLicensePlate);
    await page.fill('#input-vehicle-model', 'Volvo FMX Heavy');
    await page.selectOption('#select-vehicle-type', 'CONTAINER_40FT');
    await page.fill('#input-max-weight', '30000');
    await page.fill('#input-max-volume', '70');
    await page.fill('#input-current-hub', 'Andromeda Hub (Hà Nội)');
    await page.click('#btn-save-vehicle');

    // VERIFY CREATED
    await expect(page.locator('table')).toContainText(testLicensePlate, { timeout: 10_000 });

    // EDIT
    const vehicleRow = page.locator('tr', { hasText: testLicensePlate });
    await vehicleRow.locator('button[data-testid^="btn-edit-vehicle-"]').click();
    await page.waitForSelector('#vehicle-form-dialog');
    await page.selectOption('#select-vehicle-status', 'MAINTENANCE');
    await page.click('#btn-save-vehicle');

    await expect(page.locator('table')).toContainText('Bảo Trì', { timeout: 10_000 });

    // DELETE
    const updatedRow = page.locator('tr', { hasText: testLicensePlate });
    await updatedRow.locator('button[data-testid^="btn-delete-vehicle-"]').click();
    await page.waitForSelector('#delete-confirm-dialog');
    await page.click('#btn-confirm-delete');

    await expect(page.locator('table')).not.toContainText(testLicensePlate, { timeout: 10_000 });
  });

  test('3. Driver CRUD: Create, Edit, Delete', async ({ page }) => {
    // Switch to Drivers tab
    await page.click('#tab-drivers');
    await page.waitForTimeout(500);

    // Check seeded driver
    await expect(page.locator('table')).toContainText('Nguyễn Văn Tài', { timeout: 10_000 });

    const testDriverName = `Tài Xế Test ${Math.floor(Math.random() * 1000)}`;
    const testPhone = `09${Math.floor(10000000 + Math.random() * 89999999)}`;

    // CREATE
    await page.click('#btn-add-driver');
    await page.waitForSelector('#driver-form-dialog');
    await page.fill('#input-driver-name', testDriverName);
    await page.fill('#input-driver-phone', testPhone);
    await page.fill('#input-driver-license-no', '790888777666');
    await page.selectOption('#select-driver-license-class', 'FC');
    await page.fill('#input-driver-exp', '7');
    await page.click('#btn-save-driver');

    // VERIFY CREATED
    await expect(page.locator('table')).toContainText(testDriverName, { timeout: 10_000 });

    // EDIT
    const driverRow = page.locator('tr', { hasText: testDriverName });
    await driverRow.locator('button[data-testid^="btn-edit-driver-"]').click();
    await page.waitForSelector('#driver-form-dialog');
    await page.selectOption('#select-driver-status', 'ON_TRIP');
    await page.click('#btn-save-driver');

    await expect(page.locator('table')).toContainText('Đang Đi Chuyến', { timeout: 10_000 });

    // DELETE
    const updatedDriverRow = page.locator('tr', { hasText: testDriverName });
    await updatedDriverRow.locator('button[data-testid^="btn-delete-driver-"]').click();
    await page.waitForSelector('#delete-confirm-dialog');
    await page.click('#btn-confirm-delete');

    await expect(page.locator('table')).not.toContainText(testDriverName, { timeout: 10_000 });
  });

  test('4. SPA API Auto-Refresh (Access Token Expires in 1m)', async ({ page }) => {
    test.setTimeout(120_000);

    await expect(page.getByRole('heading', { name: /Quản Lý Đội Xe/i })).toBeVisible();

    console.log('⏳ Waiting 65s for 1-minute Access Token to expire (SPA mode)...');
    await page.waitForTimeout(65_000);

    // Trigger an API request by searching
    const searchInput = page.locator('#fleet-search-input');
    await searchInput.fill('75H');

    // Verify response: User should NOT be logged out or redirected to sign-in
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole('heading', { name: /Quản Lý Đội Xe/i })).toBeVisible();
    console.log('✅ SPA API Refresh Token rotation successfully renewed session!');
  });

  test('5. Page Reload / F5 Auto-Refresh (Access Token Expires in 1m)', async ({ page }) => {
    test.setTimeout(120_000);

    await expect(page.getByRole('heading', { name: /Quản Lý Đội Xe/i })).toBeVisible();

    console.log('⏳ Waiting 65s for 1-minute Access Token to expire before Page Reload (F5)...');
    await page.waitForTimeout(65_000);

    // Perform full page reload (F5) when access_token cookie is expired
    console.log('🔄 Reloading page (F5) after 65 seconds...');
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify Next.js middleware automatically refreshes access token and preserves session
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole('heading', { name: /Quản Lý Đội Xe/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('table')).toContainText('75H-051.21', { timeout: 10_000 });
    console.log('✅ Page Reload (F5) Middleware Refresh Token rotation successfully renewed session!');
  });
});
