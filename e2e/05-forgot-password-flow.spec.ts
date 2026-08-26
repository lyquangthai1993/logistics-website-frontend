import { test, expect } from '@playwright/test';

test.describe('Forgot Password & Reset Password E2E Flow', () => {
  test('should navigate from Sign-In to Forgot Password, submit email, and render Reset Password', async ({
    page
  }) => {
    // 1. Go to Sign-In page
    await page.goto('/auth/sign-in');
    await expect(page.locator('h1')).toContainText('Đăng nhập');

    // 2. Click "Quên mật khẩu?" link
    const forgotLink = page.getByRole('link', { name: /Quên mật khẩu/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    // 3. Verify URL & Page Content
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.locator('h1')).toContainText('Quên mật khẩu?');
    await expect(page.getByText('Nhận mã OTP qua Email')).toBeVisible();

    // 4. Verify Hotline IT text is NOT present (per updated .pen design)
    await expect(page.getByText(/Hotline IT/i)).not.toBeVisible();

    // 5. Fill valid existing email and submit form
    const emailInput = page.getByLabel(/Địa chỉ Email doanh nghiệp/i);
    await emailInput.fill('lyquangthai1993+2@gmail.com');

    const submitBtn = page.getByRole('button', { name: /Gửi liên kết khôi phục/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 6. Verify Success State
    await expect(page.getByText('Đã gửi yêu cầu khôi phục!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('lyquangthai1993+2@gmail.com')).toBeVisible();

    // 7. Verify Reset Password Page
    await page.goto('/auth/reset-password?hash=test_mock_hash_123');
    await expect(page.locator('h1')).toContainText('Đặt lại mật khẩu');
    await expect(page.getByLabel(/Mật khẩu mới/i).first()).toBeVisible();
    await expect(page.getByLabel(/Xác nhận mật khẩu mới/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Cập nhật mật khẩu mới/i })).toBeVisible();
  });
});
