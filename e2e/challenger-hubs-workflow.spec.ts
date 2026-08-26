import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, clearSession } from './helpers/auth';

test.describe('Challenger 2 Empirical Verification: Hubs Modals, Validations & Mutations', () => {
  const superAdmin = TEST_USERS.find((u) => u.role === 'SUPER_ADMIN')!;

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, superAdmin);
    await page.goto('/dashboard/admin/hubs');
    await page.waitForLoadState('networkidle');
  });

  test('1. Hub Creation dialog validation and workflow', async ({ page }) => {
    // Open Add Hub dialog
    const addBtn = page.locator('#btn-add-hub');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.locator('#hub-form-dialog');
    await expect(dialog).toBeVisible();

    // Check required fields HTML5 validation
    const codeInput = page.locator('#input-hub-code');
    const cityInput = page.locator('#input-hub-city');
    const nameInput = page.locator('#input-hub-name');
    const addressInput = page.locator('#input-hub-address');
    const managerInput = page.locator('#input-hub-manager');
    const phoneInput = page.locator('#input-hub-phone');
    const activeCheckbox = page.locator('#input-hub-is-active');

    await expect(codeInput).toHaveAttribute('required', '');
    await expect(cityInput).toHaveAttribute('required', '');
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(activeCheckbox).toBeChecked();

    // Create a new valid hub
    const uniqueSuffix = Date.now().toString().slice(-4);
    const newCode = `HUB-CH2-${uniqueSuffix}`;
    const newName = `Challenger Hub ${uniqueSuffix}`;
    const newCity = 'Cần Thơ';
    const newAddress = '123 Đại Lộ Hòa Bình, Ninh Kiều, Cần Thơ';
    const newManager = 'Trần Văn Challenge';
    const newPhone = '0292-123-4567';

    await codeInput.fill(newCode);
    await cityInput.fill(newCity);
    await nameInput.fill(newName);
    await addressInput.fill(newAddress);
    await managerInput.fill(newManager);
    await phoneInput.fill(newPhone);

    // Submit form
    const submitBtn = dialog.locator('button[type="submit"]');
    await expect(submitBtn).toHaveText('Thêm Chi Nhánh');
    await submitBtn.click();

    // Verify dialog closes and toast shows success
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
    const successToast = page.locator(`text=Tạo mới chi nhánh "${newName}" thành công!`);
    await expect(successToast).toBeVisible({ timeout: 8_000 });

    // Verify newly created hub appears in the listing using search filter
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill(newCode);
    await page.waitForTimeout(500);

    const createdRow = page.locator(`text=${newCode}`);
    await expect(createdRow.first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator(`text=${newName}`).first()).toBeVisible();
    await expect(page.locator(`text=${newAddress}`).first()).toBeVisible();
    await expect(page.locator(`text=${newManager}`).first()).toBeVisible();
  });

  test('2. Hub Edit dialog prefilling, updating, and cache invalidation', async ({ page }) => {
    // Search for a specific seeded hub (e.g. Centaurus Hub)
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill('Centaurus');
    await page.waitForTimeout(500);

    const hubRow = page.locator('tr', { hasText: 'Centaurus Hub' }).first();
    await expect(hubRow).toBeVisible({ timeout: 8_000 });

    // Click edit button in row actions (using force: true to bypass layout collision)
    const editBtn = hubRow.locator('button[data-testid^="btn-edit-hub-"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click({ force: true });

    const dialog = page.locator('#hub-form-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2, [role="heading"]')).toContainText('Chỉnh Sửa Chi Nhánh Kho');

    // Verify fields are prefilled correctly
    const codeInput = page.locator('#input-hub-code');
    const nameInput = page.locator('#input-hub-name');
    const cityInput = page.locator('#input-hub-city');
    const managerInput = page.locator('#input-hub-manager');

    await expect(codeInput).toHaveValue('HUB-SGN-01');
    await expect(nameInput).toHaveValue('Centaurus Hub');
    await expect(cityInput).toHaveValue('TP. Hồ Chí Minh');

    // Modify a field (manager)
    const updatedManager = `Lê Hoàng Nam ${Date.now().toString().slice(-3)}`;
    await managerInput.fill(updatedManager);

    // Submit edit form
    const saveBtn = dialog.locator('button[type="submit"]');
    await expect(saveBtn).toHaveText('Lưu Thay Đổi');
    await saveBtn.click();

    // Verify dialog closes and toast appears
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });
    const updateToast = page.locator('text=Cập nhật chi nhánh "Centaurus Hub" thành công!');
    await expect(updateToast).toBeVisible({ timeout: 8_000 });

    // Verify updated manager name is rendered in the table row
    await expect(page.locator(`text=${updatedManager}`).first()).toBeVisible({ timeout: 8_000 });
  });

  test('3. Soft Delete alert dialog with attached vehicles warning', async ({ page }) => {
    // Search for a hub with attached vehicles (e.g. Centaurus Hub which has vehicles)
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill('Centaurus');
    await page.waitForTimeout(500);

    const hubRow = page.locator('tr', { hasText: 'Centaurus Hub' }).first();
    await expect(hubRow).toBeVisible({ timeout: 8_000 });

    // Open delete confirmation dialog
    const deleteBtn = hubRow.locator('button[data-testid^="btn-delete-hub-"]');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click({ force: true });

    const deleteDialog = page.locator('div[role="dialog"]', {
      hasText: 'Xác Nhận Xóa Mềm Chi Nhánh Kho'
    });
    await expect(deleteDialog).toBeVisible();

    // Verify attached vehicles warning is rendered
    const warningBox = deleteDialog.locator('text=Lưu ý: Hiện có');
    await expect(warningBox).toBeVisible();
    await expect(warningBox).toContainText('phương tiện đang trực thuộc chi nhánh này');
    await expect(warningBox).toContainText(
      'Sau khi xóa mềm, liên kết kho của các phương tiện này sẽ được giải phóng an toàn'
    );

    // Test Cancel button closes dialog without deleting
    const cancelBtn = deleteDialog.locator('button:has-text("Hủy")');
    await cancelBtn.click();
    await expect(deleteDialog).not.toBeVisible();
    await expect(hubRow).toBeVisible();

    // Now create a temporary disposable hub to test actual deletion
    const addBtn = page.locator('#btn-add-hub');
    await addBtn.click();
    const uniqueSuffix = Date.now().toString().slice(-4);
    const tempCode = `HUB-DEL-${uniqueSuffix}`;
    const tempName = `Kho Deletable ${uniqueSuffix}`;
    await page.fill('#input-hub-code', tempCode);
    await page.fill('#input-hub-city', 'Huế');
    await page.fill('#input-hub-name', tempName);
    await page.click('#hub-form-dialog button[type="submit"]');
    await expect(page.locator('#hub-form-dialog')).not.toBeVisible({ timeout: 8_000 });

    // Search for the disposable hub
    await searchInput.fill(tempCode);
    await page.waitForTimeout(500);
    const tempRow = page.locator('tr', { hasText: tempCode }).first();
    await expect(tempRow).toBeVisible();

    // Click delete on disposable hub (which has 0 vehicles)
    const tempDeleteBtn = tempRow.locator('button[data-testid^="btn-delete-hub-"]');
    await tempDeleteBtn.click({ force: true });
    const confirmDeleteDialog = page.locator('div[role="dialog"]', {
      hasText: 'Xác Nhận Xóa Mềm Chi Nhánh Kho'
    });
    await expect(confirmDeleteDialog).toBeVisible();

    // For a hub with 0 vehicles, the vehicle warning box should NOT be displayed
    await expect(confirmDeleteDialog.locator('text=Lưu ý: Hiện có')).not.toBeVisible();

    // Confirm soft delete
    const confirmDeleteBtn = confirmDeleteDialog.locator('button:has-text("Xác Nhận Xóa Mềm")');
    await confirmDeleteBtn.click();

    // Verify success toast and disappearance
    await expect(confirmDeleteDialog).not.toBeVisible({ timeout: 8_000 });
    const deleteToast = page.locator('text=Đã xóa mềm chi nhánh');
    await expect(deleteToast).toBeVisible({ timeout: 8_000 });
  });

  test('4. Active status toggle mutation and counter synchronization', async ({ page }) => {
    // Search for a known hub
    const searchInput = page.locator('#hub-search-input');
    await searchInput.fill('Magellan Hub');
    await page.waitForTimeout(500);

    const hubRow = page.locator('tr', { hasText: 'Magellan Hub' }).first();
    await expect(hubRow).toBeVisible({ timeout: 8_000 });

    // Initial state: Hoạt Động
    const statusBadge = hubRow.locator('td', { hasText: /Hoạt Động|Tạm Ngưng/ });
    const initialText = await statusBadge.innerText();

    // Find toggle button
    const toggleBtn = hubRow.locator('button[aria-label="Bật/Tắt hoạt động kho"]');
    await expect(toggleBtn).toBeVisible();

    // Click toggle to flip status
    await toggleBtn.click({ force: true });

    // Wait for toast and status badge change
    if (initialText.includes('Hoạt Động')) {
      const toastMsg = page.locator('text=Đã tạm ngưng hoạt động chi nhánh "Magellan Hub"');
      await expect(toastMsg).toBeVisible({ timeout: 8_000 });
      await expect(statusBadge).toContainText('Tạm Ngưng');
    } else {
      const toastMsg = page.locator('text=Đã kích hoạt hoạt động chi nhánh "Magellan Hub"');
      await expect(toastMsg).toBeVisible({ timeout: 8_000 });
      await expect(statusBadge).toContainText('Hoạt Động');
    }

    // Toggle back to restore original state
    await toggleBtn.click({ force: true });
    if (initialText.includes('Hoạt Động')) {
      const toastMsg = page.locator('text=Đã kích hoạt hoạt động chi nhánh "Magellan Hub"');
      await expect(toastMsg).toBeVisible({ timeout: 8_000 });
      await expect(statusBadge).toContainText('Hoạt Động');
    } else {
      const toastMsg = page.locator('text=Đã tạm ngưng hoạt động chi nhánh "Magellan Hub"');
      await expect(toastMsg).toBeVisible({ timeout: 8_000 });
      await expect(statusBadge).toContainText('Tạm Ngưng');
    }
  });
});
