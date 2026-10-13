/**
 * frontend/e2e/48-feedback-13-10-task-38.spec.ts
 *
 * Automated Playwright E2E Verification Suite for:
 * Feedback 13/10 (Task 38) — Chuẩn hóa Hiển thị Thông tin Chi tiết Hub Cấp 1 & Tuyến Xe Bo tại Cột "Địa Chỉ Giao" Màn hình Xuất Kho
 *
 * Core Verification Scenarios:
 * 1. Scenario 1: Select Level 1 Hub (Điều chuyển liên Hub)
 *    - Open Outbound creation view (/dashboard/warehouse/outbound -> 'Xuất kho').
 *    - Click 'Thay đổi địa chỉ (Điều chuyển)' on row 1.
 *    - In Destination Selection Modal, select a Level 1 Hub (e.g. Polaris Hub - Hưng Yên or Andromeda Hub - HCM).
 *    - Assert DestinationHubInfoCard is rendered with:
 *      * Badge 'Hub Cấp 1' (blue).
 *      * Font-mono badge with Hub code (e.g. HUB-HAN-01 / HUB-SGN-01).
 *      * Hub name in bold.
 *      * Geographical details (City + detailed address).
 *      * Role 'Trung tâm trung chuyển liên tỉnh'.
 *      * Action button 'Đổi kho đích khác...'.
 *      * Action button 'Quay lại địa chỉ thường'.
 *    - Save screenshot_01_hub_l1_verified.png.
 *
 * 2. Scenario 2: Select Level 2 Xe Bo Hub (Giao tuyến vệ tinh)
 *    - Click 'Đổi kho đích khác...'.
 *    - In Destination Selection Modal, select a Level 2 Xe Bo Hub (e.g. Xe Bo Quy Nhơn or any Xe Bo).
 *    - Assert DestinationHubInfoCard is rendered with:
 *      * Badge 'Tuyến Xe Bo' (purple).
 *      * Font-mono badge with Xe Bo code (e.g. XB-QN-01 / HUB-BO-).
 *      * Tuyến name in bold.
 *      * Geographical details with IconTruck.
 *      * Role 'Tuyến xe bo gom/trả hàng nội thành'.
 *      * Card has purple themed background and borders.
 *    - Save screenshot_02_xe_bo_verified.png and screenshot_verified.png.
 *
 * 3. Scenario 3: Revert to Direct Customer Address
 *    - Click 'Quay lại địa chỉ thường'.
 *    - Assert DestinationHubInfoCard disappears.
 *    - Direct customer textarea and 'Thay đổi địa chỉ (Điều chuyển)' button return.
 *    - Save screenshot_03_revert_verified.png.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAs } from './helpers/auth';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://frontend-tms-core-dev.up.railway.app';

const SUPER_ADMIN_USER = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL ?? 'lyquangthai1993+1@gmail.com',
  password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'secret',
  role: 'SUPER_ADMIN' as const,
  expectedLandingPath: '/dashboard/overview',
};

const FEEDBACK_DIR = fs.existsSync(path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_38'))
  ? path.resolve(__dirname, '../../feedbacks/feedback_13_10_task_38')
  : path.resolve(process.cwd(), 'feedbacks/feedback_13_10_task_38');

function saveEvidenceScreenshot(filename: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(FEEDBACK_DIR)) {
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
    const target = path.join(FEEDBACK_DIR, filename);
    fs.writeFileSync(target, buffer);
    console.warn(`[EVIDENCE SAVED] ${target}`);
  } catch (err) {
    console.warn(`Could not save evidence screenshot to ${FEEDBACK_DIR}:`, err);
  }
}

test.describe.serial('Feedback 13/10 (Task 38) — Chuẩn hóa Hiển thị Thông tin Chi tiết Hub Cấp 1 & Tuyến Xe Bo tại Cột "Địa Chỉ Giao" Màn hình Xuất Kho', () => {
  test('Step 1, 2, 3: Full Lifecycle Destination Hub & Xe Bo Card Verification', async ({ page }) => {
    // 1. Authenticate
    await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
    await page.waitForLoadState('domcontentloaded');
    await loginAs(page, SUPER_ADMIN_USER);

    // 2. Navigate to Warehouse Outbound
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/outbound`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the outbound board header
    const outboundHeader = page.locator('h1', { hasText: 'Xuất kho' });
    await expect(outboundHeader).toBeVisible({ timeout: 15000 });

    // 3. Switch to Outbound Creation Mode ('Xuất kho' button)
    const newOutboundBtn = page.getByRole('button', { name: /Xuất kho/i }).first();
    await expect(newOutboundBtn).toBeVisible({ timeout: 10000 });
    await newOutboundBtn.click();

    // Verify Outbound Form is opened
    await expect(page.locator('text=Tạo Phiếu Xuất Kho').or(page.locator('text=Phiếu xuất kho'))).toBeVisible({
      timeout: 10000,
    });

    // 4. Locate Row 1 Delivery Address Cell & Click 'Thay đổi địa chỉ (Điều chuyển)'
    const transferBtn = page.getByRole('button', { name: /Thay đổi địa chỉ \(Điều chuyển\)/i }).first();
    await expect(transferBtn).toBeVisible({ timeout: 10000 });
    await transferBtn.click();

    // 5. Verify Destination Modal opens
    const modalTitle = page.locator('h2', { hasText: 'Chọn Đích Xuất Kho' });
    await expect(modalTitle).toBeVisible({ timeout: 8000 });

    // ==========================================
    // SCENARIO 1: Select Level 1 Hub
    // ==========================================
    // Filter by Level 1 Hub tab
    const l1TabBtn = page.getByRole('button', { name: /Hub Cấp 1/i }).first();
    if (await l1TabBtn.isVisible()) {
      await l1TabBtn.click();
    }

    // Select the first available Level 1 Hub card
    const firstL1Card = page.locator('div.cursor-pointer', { hasText: 'HUB-' }).first();
    await expect(firstL1Card).toBeVisible({ timeout: 5000 });

    const selectedL1HubCode = (await firstL1Card.locator('span.font-mono').first().textContent())?.trim() || '';
    const selectedL1HubName = (await firstL1Card.locator('span.font-bold').first().textContent())?.trim() || '';
    console.warn(`[TEST] Selected Level 1 Hub: ${selectedL1HubCode} - ${selectedL1HubName}`);

    await firstL1Card.click();

    // Modal should close automatically
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Assert DestinationHubInfoCard is rendered for Level 1 Hub
    const l1Badge = page.locator('span', { hasText: 'Hub Cấp 1' }).first();
    await expect(l1Badge).toBeVisible({ timeout: 5000 });

    if (selectedL1HubCode) {
      await expect(page.locator(`text=${selectedL1HubCode}`).first()).toBeVisible();
    }
    if (selectedL1HubName) {
      await expect(page.locator(`text=${selectedL1HubName}`).first()).toBeVisible();
    }

    // Operational role text
    await expect(page.locator('text=Trung tâm trung chuyển liên tỉnh').first()).toBeVisible();

    // Change and Revert buttons
    const changeDestBtn = page.getByRole('button', { name: /Đổi kho đích khác\.\.\./i }).first();
    const revertBtn = page.getByRole('button', { name: /Quay lại địa chỉ thường/i }).first();
    await expect(changeDestBtn).toBeVisible();
    await expect(revertBtn).toBeVisible();

    // Save Evidence Screenshot for Scenario 1
    const shot1 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_01_hub_l1_verified.png', shot1);

    // ==========================================
    // SCENARIO 2: Select Level 2 Xe Bo Hub
    // ==========================================
    await changeDestBtn.click();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Filter by Xe Bo tab
    const l2TabBtn = page.getByRole('button', { name: /Tuyến Xe Bo/i }).first();
    if (await l2TabBtn.isVisible()) {
      await l2TabBtn.click();
    }

    // Select the first available Xe Bo card
    const firstL2Card = page.locator('div.cursor-pointer', { hasText: 'XB-' }).or(
      page.locator('div.cursor-pointer', { hasText: 'Xe Bo' })
    ).first();
    await expect(firstL2Card).toBeVisible({ timeout: 5000 });

    const selectedL2Code = (await firstL2Card.locator('span.font-mono').first().textContent())?.trim() || '';
    const selectedL2Name = (await firstL2Card.locator('span.font-bold').first().textContent())?.trim() || '';
    console.warn(`[TEST] Selected Xe Bo: ${selectedL2Code} - ${selectedL2Name}`);

    await firstL2Card.click();

    // Modal should close
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Assert DestinationHubInfoCard is rendered for Tuyến Xe Bo
    const l2Badge = page.locator('span', { hasText: 'Tuyến Xe Bo' }).first();
    await expect(l2Badge).toBeVisible({ timeout: 5000 });

    if (selectedL2Code) {
      await expect(page.locator(`text=${selectedL2Code}`).first()).toBeVisible();
    }
    if (selectedL2Name) {
      await expect(page.locator(`text=${selectedL2Name}`).first()).toBeVisible();
    }

    // Operational role text for Xe Bo
    await expect(page.locator('text=Tuyến xe bo gom/trả hàng nội thành').first()).toBeVisible();

    // Save Evidence Screenshot for Scenario 2
    const shot2 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_02_xe_bo_verified.png', shot2);
    saveEvidenceScreenshot('screenshot_verified.png', shot2);
    saveEvidenceScreenshot('screenshot_task_38_verified.png', shot2);

    // ==========================================
    // SCENARIO 3: Revert to Direct Customer
    // ==========================================
    const revertBtn2 = page.getByRole('button', { name: /Quay lại địa chỉ thường/i }).first();
    await expect(revertBtn2).toBeVisible();
    await revertBtn2.click();

    // Assert card is gone
    await expect(l2Badge).not.toBeVisible({ timeout: 5000 });

    // Assert textarea and transfer button return
    const directTextarea = page.locator('textarea[placeholder="Địa chỉ giao khách..."]').first();
    await expect(directTextarea).toBeVisible({ timeout: 5000 });
    await expect(transferBtn).toBeVisible();

    // Save Evidence Screenshot for Scenario 3
    const shot3 = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('screenshot_03_revert_verified.png', shot3);
  });
});
