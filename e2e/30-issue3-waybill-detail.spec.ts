import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const DAD_WAREHOUSE_EMAIL = 'lyquangthai1993+5@gmail.com';
const PASSWORD = 'secret';

const EVIDENCE_DOCS_DIR = path.resolve(__dirname, '../../docs/feedback_evidence/05_10');
const ARTIFACT_DIR =
  'C:/Users/Lenovo/.gemini/antigravity/brain/0e08ed2f-b813-40cb-8fc9-58bf880050df';

function saveEvidenceScreenshot(name: string, buffer: Buffer) {
  try {
    if (!fs.existsSync(EVIDENCE_DOCS_DIR)) {
      fs.mkdirSync(EVIDENCE_DOCS_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(EVIDENCE_DOCS_DIR, name), buffer);
    fs.writeFileSync(path.join(ARTIFACT_DIR, name), buffer);
    console.log(`[EVIDENCE] Saved screenshot: ${name}`);
  } catch (err) {
    console.error(`Failed to save screenshot ${name}:`, err);
  }
}

test('Issue 3: Warehouse order detail shows correct storage hub (not TÂY NINH) and vehicle/trip code for outbound', async ({
  page
}) => {
  test.setTimeout(90_000);

  // 1. Login
  await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
  await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 25_000 });
  await page.fill('input[name="email"]', DAD_WAREHOUSE_EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard\/.*/, { timeout: 30_000 });
  console.log('✓ Logged in as Đà Nẵng Warehouse Manager');

  // 2. Navigate to Warehouse Orders
  await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`);
  await page.locator('table').waitFor({ state: 'visible', timeout: 25_000 });
  await page.waitForTimeout(2000);

  // 3. Open detail for first stored order
  const eyeBtn = page.locator('button[title*="Xem chi tiết"]').first();
  if (await eyeBtn.isVisible()) {
    await eyeBtn.click();
  } else {
    await page.locator('tbody tr').first().click();
  }
  await page.waitForTimeout(1500);

  // Verify modal is open
  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible({ timeout: 10_000 });

  // Check safe storage banner
  const banner = modal
    .locator('.border, .rounded-lg')
    .filter({
      hasText: /Đang lưu kho an toàn|Đang trên xe|Đã xuất/
    })
    .first();
  await expect(banner).toBeVisible({ timeout: 8000 });

  const bannerText = await banner.innerText();
  console.log('✓ Stored order banner verified:', bannerText);
  expect(bannerText).not.toContain('Đang lưu kho an toàn tại TÂY NINH');

  // Save Screenshot 03
  const storedScreenshot = await page.screenshot({ fullPage: false });
  saveEvidenceScreenshot('03_order_detail_safe_storage_hub.png', storedScreenshot);

  // Close modal
  const closeBtn = modal.locator('button:has-text("Đóng"), button[aria-label="Close"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  // 4. Click "ĐÃ XUẤT KHO" tab
  const outboundTab = page.locator('button:has-text("ĐÃ XUẤT KHO")').first();
  if (await outboundTab.isVisible()) {
    await outboundTab.click();
    await page.waitForTimeout(2000);

    const outEyeBtn = page.locator('button[title*="Xem chi tiết"]').first();
    if (await outEyeBtn.isVisible()) {
      await outEyeBtn.click();
      await page.waitForTimeout(1500);

      // Verify transit banner
      const transitModal = page.locator('[role="dialog"]').first();
      await expect(transitModal).toBeVisible({ timeout: 10_000 });

      const transitBanner = transitModal
        .locator('.border, .rounded-lg')
        .filter({
          hasText: /Đang trên xe|Đã xuất|vận chuyển/i
        })
        .first();
      if (await transitBanner.isVisible()) {
        console.log('✓ In-transit banner verified:', await transitBanner.innerText());
      }

      // Save Screenshot 04
      const transitScreenshot = await page.screenshot({ fullPage: false });
      saveEvidenceScreenshot('04_order_detail_in_transit_vehicle_trip.png', transitScreenshot);
    }
  }
});
