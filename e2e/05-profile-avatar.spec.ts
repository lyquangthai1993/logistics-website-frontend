import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, clearSession } from './helpers/auth';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Profile Avatar Upload & Removal Flow', () => {
  const superAdmin = TEST_USERS[0];
  const testImagePath = path.join(__dirname, 'test-avatar.png');

  test.beforeAll(() => {
    // Create a 1x1 transparent PNG file for testing
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngBuffer);
  });

  test.afterAll(() => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await loginAs(page, superAdmin);
  });

  test('should successfully upload new avatar image and then remove it', async ({ page }) => {
    // 1. Navigate to profile page
    await page.goto('/dashboard/profile');
    await page.waitForURL('/dashboard/profile', { waitUntil: 'networkidle' });

    // Verify profile page loaded
    await expect(page.locator('main').getByText(superAdmin.email)).toBeVisible();

    // 2. Select image file via hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Verify "Lưu thay đổi" and "Hủy" buttons are displayed
    const saveBtn = page.getByRole('button', { name: 'Lưu thay đổi' });
    const cancelBtn = page.getByRole('button', { name: 'Hủy' });
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();

    // 3. Set up request listeners for API verification
    const uploadPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/files/upload') && resp.status() === 201
    );
    const updateAuthPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/auth/me') && resp.request().method() === 'PATCH' && resp.status() === 200
    );

    // 4. Click Save
    await saveBtn.click();

    // 5. Verify API responses
    const uploadResp = await uploadPromise;
    const uploadJson = await uploadResp.json();
    expect(uploadJson.file).toBeDefined();
    expect(uploadJson.file.id).toBeDefined();

    const updateResp = await updateAuthPromise;
    const updateJson = await updateResp.json();
    expect(updateJson.photo).toBeDefined();
    expect(updateJson.photo.id).toBe(uploadJson.file.id);

    // 6. Verify toast notification
    await expect(page.getByText('Cập nhật ảnh đại diện thành công!')).toBeVisible({ timeout: 10_000 });

    // 7. Reload page and check avatar persists
    await page.reload({ waitUntil: 'networkidle' });
    const removeBtn = page.getByRole('button', { name: 'Xóa ảnh' });
    await expect(removeBtn).toBeVisible();

    // 8. Test removing avatar
    const removeAuthPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/auth/me') && resp.request().method() === 'PATCH' && resp.status() === 200
    );

    await removeBtn.click();

    const removeResp = await removeAuthPromise;
    const removeJson = await removeResp.json();
    expect(removeJson.photo).toBeFalsy();

    await expect(page.getByText('Đã xóa ảnh đại diện.')).toBeVisible({ timeout: 10_000 });
  });
});
