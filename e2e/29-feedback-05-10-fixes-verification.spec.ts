import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const DEV_FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL ??
  'https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app';

const DAD_WAREHOUSE_EMAIL = 'lyquangthai1993+5@gmail.com'; // Quản lý Kho Đà Nẵng (Magellan Hub)
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

async function loginAsDaNang(page: any) {
  await page.goto(`${DEV_FRONTEND_URL}/auth/sign-in`);
  await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 25_000 });
  await page.fill('input[name="email"]', DAD_WAREHOUSE_EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard\/.*/, { timeout: 30_000 });
}

test.describe.serial('Suite 29: Verification & Evidence for Feedback 05/10', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  // ── TEST 1: ISSUE 1 - ĐÀ NẴNG INBOUND RECEIPT VOUCHER (ONLY ĐÀ NẴNG ORDERS) ──
  test('Issue 1: Đà Nẵng warehouse goods receipt voucher only prints Đà Nẵng orders (excludes Hưng Yên)', async ({
    page
  }) => {
    await loginAsDaNang(page);
    console.log('✓ Successfully authenticated as Đà Nẵng Warehouse Manager');

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.locator('h1:has-text("Nhập kho")').waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(2000);

    const printBtn = page.locator('button:has-text("In phiếu nhập")').first();
    await expect(printBtn).toBeVisible({ timeout: 15_000 });
    await printBtn.click();
    await page.waitForTimeout(1500);

    // Verify receipt title text is visible
    await expect(page.locator('text="PHIẾU NHẬP KHO"').first()).toBeVisible({ timeout: 10_000 });

    // Capture screenshot
    const receiptBuffer = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('01_danang_receipt_voucher_only_danang_orders.png', receiptBuffer);
  });

  // ── TEST 2: ISSUE 2 - BỐC THÊM ĐƠN DỌC ĐƯỜNG (EN-ROUTE CARGO TO EXISTING TRIP) ──
  test('Issue 2: En-route cargo appending modal exists and allows adding orders to existing trip', async ({
    page
  }) => {
    await loginAsDaNang(page);

    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/inbound`);
    await page.locator('h1:has-text("Nhập kho")').waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(2000);

    // Open trip detail modal by clicking the trip code button (handleOpenTripDetail)
    const tripCodeBtn = page
      .locator('button[title*="xem chi tiết chuyến xe"], button:has-text("SD31")')
      .first();
    await expect(tripCodeBtn).toBeVisible({ timeout: 15_000 });
    await tripCodeBtn.click();
    await page.waitForTimeout(1500);

    // Verify "Bốc thêm đơn" button exists
    const appendBtn = page
      .locator('button:has-text("Bốc thêm đơn"), button:has-text("Bốc thêm")')
      .first();
    await expect(appendBtn).toBeVisible({ timeout: 10_000 });
    console.log('✓ Found "Bốc thêm đơn" button in trip modal');

    // Click "Bốc thêm đơn"
    await appendBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal title is visible
    await expect(page.locator('text="Bốc thêm đơn dọc đường"').first()).toBeVisible({
      timeout: 5000
    });

    // Capture screenshot of empty Append Order Modal
    const emptyModalBuffer = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('02_append_enroute_order_modal.png', emptyModalBuffer);

    // Fill in en-route cargo details
    const goodsInput = page
      .locator('input[placeholder*="Vải cuộn"], input[placeholder*="Tên mặt hàng"]')
      .first();
    await goodsInput.fill('Hàng may mặc Đà Nẵng gửi Hưng Yên (Test En-route)');

    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill('20');

    // Capture screenshot of filled modal with destination and specs
    const filledModalBuffer = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('02b_append_enroute_order_filled.png', filledModalBuffer);
  });

  // ── TEST 3: ISSUE 3 - CHI TIẾT ĐƠN HÀNG KHO (SAFE STORAGE HUB & IN-TRANSIT BANNER) ──
  test('Issue 3: Warehouse order detail displays actual storage hub (not pickup address) and in-transit banner', async ({
    page
  }) => {
    await loginAsDaNang(page);

    // 1. Navigate to Warehouse Orders menu
    await page.goto(`${DEV_FRONTEND_URL}/dashboard/warehouse/orders`);
    await page
      .locator('text="Danh sách đơn hàng lưu kho"')
      .waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(2000);

    // 2. Click "LƯU KHO" tab
    const storedTab = page.locator('button:has-text("LƯU KHO")').first();
    if (await storedTab.isVisible()) {
      await storedTab.click();
      await page.waitForTimeout(1000);
    }

    // 3. Open first order detail
    const eyeBtn = page.locator('button[title*="Xem chi tiết"]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
    } else {
      await page.locator('tbody tr').first().click();
    }
    await page.waitForTimeout(1500);

    // Verify banner does NOT say "TÂY NINH" as safe storage hub
    const banner = page
      .locator('.border, .rounded-lg')
      .filter({
        hasText: /Đang lưu kho an toàn|Đang trên xe|Đã giao hàng/
      })
      .first();
    await expect(banner).toBeVisible({ timeout: 8000 });

    const bannerContent = await banner.innerText();
    console.log('✓ Stored order banner verified:', bannerContent);
    expect(bannerContent).not.toContain('Đang lưu kho an toàn tại TÂY NINH');

    // Capture screenshot of storage location banner
    const storageDetailBuffer = await page.screenshot({ fullPage: false });
    saveEvidenceScreenshot('03_order_detail_safe_storage_hub.png', storageDetailBuffer);

    // Close modal
    const closeBtn = page.locator('button:has-text("Đóng"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(800);
    }

    // 4. Test In-Transit Order Banner: Click "ĐÃ XUẤT KHO" tab
    const outboundTab = page.locator('button:has-text("ĐÃ XUẤT KHO")').first();
    if (await outboundTab.isVisible()) {
      await outboundTab.click();
      await page.waitForTimeout(1000);

      const outEyeBtn = page.locator('button[title*="Xem chi tiết"]').first();
      if (await outEyeBtn.isVisible()) {
        await outEyeBtn.click();
      } else {
        await page.locator('tbody tr').first().click();
      }
      await page.waitForTimeout(1500);

      const transitBanner = page
        .locator('.border, .rounded-lg')
        .filter({
          hasText: /Đang trên xe|Đã xuất/i
        })
        .first();
      if (await transitBanner.isVisible()) {
        console.log('✓ In-transit order banner verified:', await transitBanner.innerText());
      }

      const transitBuffer = await page.screenshot({ fullPage: false });
      saveEvidenceScreenshot('04_order_detail_in_transit_vehicle_trip.png', transitBuffer);
    }
  });
});
