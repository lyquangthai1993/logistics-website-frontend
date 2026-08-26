import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Challenger 2 Empirical Hardening Suite: Hubs CRUD & Instant Reactivity without Page Reload', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/admin/hubs');
    await page.waitForLoadState('networkidle');
  });

  test('Empirical Test 1: Active toggle immediate reactivity (double flip without reload)', async ({
    page
  }) => {
    // 1. Locate search input and search for a stable seed hub
    const searchInput = page.locator('#hub-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Andromeda Hub');
    await page.waitForTimeout(600);

    const hubRow = page.locator('tbody tr').first();
    await expect(hubRow).toBeVisible();

    const statusBadge = hubRow.locator('td:nth-child(6)');
    const initialStatusText = (await statusBadge.innerText()).trim();

    // Toggle 1st time
    const toggleBtn = hubRow.locator('button[aria-label="Bật/Tắt hoạt động kho"]');
    await toggleBtn.click();

    // Verify sonner toast notification appears
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });

    // Assert immediate status flip in DOM
    const flippedStatus = initialStatusText.includes('Hoạt Động') ? 'Tạm Ngưng' : 'Hoạt Động';
    await expect(statusBadge).toContainText(flippedStatus, { timeout: 4000 });

    // Toggle 2nd time to restore initial status
    await page.waitForTimeout(600);
    await toggleBtn.click();
    await expect(statusBadge).toContainText(initialStatusText, { timeout: 4000 });
  });

  test('Empirical Test 2: Hub creation and edit immediate reactivity without page reload', async ({
    page
  }) => {
    // 1. Create a new hub
    const addBtn = page.locator('#btn-add-hub');
    await addBtn.click();

    const dialog = page.locator('#hub-form-dialog');
    await expect(dialog).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const createCode = `C2-${timestamp}`;
    const createName = `Kho Challenger 2 ${timestamp}`;
    const createCity = 'Cần Thơ';

    await page.fill('#input-hub-code', createCode);
    await page.fill('#input-hub-city', createCity);
    await page.fill('#input-hub-name', createName);
    await page.fill('#input-hub-address', '123 Đường 30/4, Ninh Kiều, Cần Thơ');
    await page.fill('#input-hub-manager', 'Lê Văn Thử Nghiệm');
    await page.fill('#input-hub-phone', '0912345678');

    await page.click('button[type="submit"]:has-text("Thêm Chi Nhánh")');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify row immediately visible in table
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill(createCode);
    await page.waitForTimeout(600);

    const createdRow = page.locator('tbody tr', { hasText: createCode });
    await expect(createdRow).toBeVisible({ timeout: 4000 });
    await expect(createdRow).toContainText(createName);
    await expect(createdRow).toContainText(createCity);
    await expect(createdRow).toContainText('Lê Văn Thử Nghiệm');

    // 2. Edit the newly created hub
    const editBtn = createdRow.locator('button[aria-label="Chỉnh sửa kho"]');
    await editBtn.click();
    await expect(dialog).toBeVisible();

    const updatedName = `Kho Đã Sửa ${timestamp}`;
    const updatedCity = 'Hải Phòng';
    const updatedManager = 'Trần Văn Cập Nhật';

    await page.fill('#input-hub-name', updatedName);
    await page.fill('#input-hub-city', updatedCity);
    await page.fill('#input-hub-manager', updatedManager);

    await page.click('button[type="submit"]:has-text("Lưu Thay Đổi")');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify table row reflects updated values immediately without manual reload
    await expect(createdRow).toContainText(updatedName, { timeout: 4000 });
    await expect(createdRow).toContainText(updatedCity);
    await expect(createdRow).toContainText(updatedManager);

    // 3. Clean up by deleting the test hub
    const deleteBtn = createdRow.locator('button[aria-label="Xóa kho"]');
    await deleteBtn.click();

    const confirmBtn = page.locator('button:has-text("Xác Nhận Xóa Mềm")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify row is immediately removed from table
    await page.waitForTimeout(600);
    const remainingMatchingRows = page.locator('tbody tr', { hasText: createCode });
    await expect(remainingMatchingRows).toHaveCount(0, { timeout: 4000 });
  });
});
