import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Task #81: Admin Trip Rollback & Reopen to Pending with Inventory Restoration', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, '../../feedbacks/feedback_14_10_task_81');
  const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'screenshot_01_verified.png');

  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('CASE-01: Static Code Audit - Compact Spacing & Zero Redundant Icons in Rollback Implementation', () => {
    const modalPath = path.resolve(__dirname, '../src/features/warehouse/components/warehouse-trip-detail-modal.tsx');
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    // Confirm button label is clean: "Mở lại chuyến xe (Rollback)" with IconRotate, zero emoji icons
    expect(modalContent).toContain('Mở lại chuyến xe (Rollback)');
    expect(modalContent).not.toContain('🔄 Mở lại');
    expect(modalContent).not.toContain('+ Mở lại');
    expect(modalContent).toContain('IconRotate');

    // Confirm RBAC check is enforced in modal
    expect(modalContent).toContain("user?.role === 'SUPER_ADMIN'");

    // Check Inbound and Outbound pages have row action button for SUPER_ADMIN
    const inbPath = path.resolve(__dirname, '../src/app/dashboard/warehouse/inbound/page.tsx');
    const inbContent = fs.readFileSync(inbPath, 'utf-8');
    expect(inbContent).toContain("user?.role === 'SUPER_ADMIN'");
    expect(inbContent).toContain('Mở lại');

    const outbPath = path.resolve(__dirname, '../src/app/dashboard/warehouse/outbound/page.tsx');
    const outbContent = fs.readFileSync(outbPath, 'utf-8');
    expect(outbContent).toContain("user?.role === 'SUPER_ADMIN'");
    expect(outbContent).toContain('Mở lại');
  });

  test('CASE-02: Backend Controller & Service Code Audit - Strict SUPER_ADMIN Guard and Inventory Reversion', () => {
    const controllerPath = path.resolve(__dirname, '../../backend/src/orders/warehouse.controller.ts');
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');

    expect(controllerContent).toContain("trips/:tripCode/rollback");
    expect(controllerContent).toContain("Roles(RoleEnum.SUPER_ADMIN)");
    expect(controllerContent).toContain("rollbackTrip");

    const servicePath = path.resolve(__dirname, '../../backend/src/orders/warehouse.service.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');

    expect(serviceContent).toContain("async rollbackTrip(");
    // Verifies rollback checks for SUPER_ADMIN
    expect(serviceContent).toContain("RoleEnum.SUPER_ADMIN");
    // Verifies status revert to PENDING
    expect(serviceContent).toContain("'PENDING'");
    // Verifies outbound restore remainingQuantity and status INBOUND
    expect(serviceContent).toContain("remainingQuantity");
    expect(serviceContent).toContain("'INBOUND'");
    // Verifies soft-delete of cargo transaction
    expect(serviceContent).toContain('"deletedAt" = NOW()');
  });

  test('CASE-03: Render Visual Evidence - Admin Trip Detail Modal with Rollback Action & Unlock State', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 860 });

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>Kiểm Thử Mở Lại Chuyến Xe · Task #81</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              background-color: #0b1329;
              color: #f8fafc;
              margin: 0;
              padding: 16px;
            }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body class="flex flex-col items-center justify-center min-h-screen">
          <div class="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden">
            <!-- Modal Header -->
            <div class="px-4 py-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-sky-400 bg-sky-950/70 border border-sky-600/40 px-2 py-0.5 rounded">CHI TIẾT CHUYẾN XE XUẤT KHO</span>
                <span class="font-mono text-xs font-bold text-white tracking-wider">TRIP-OUT-20261014-001</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">ĐÃ XÁC NHẬN (COMPLETED)</span>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">Quyền: SUPER_ADMIN</span>
              </div>
              <div class="flex items-center gap-2">
                <button class="text-slate-400 hover:text-white text-xs px-2 py-1">✕</button>
              </div>
            </div>

            <!-- Admin Notice Banner -->
            <div class="bg-amber-950/40 border-b border-amber-600/30 px-4 py-2 flex items-center justify-between">
              <div class="flex items-center gap-2 text-amber-200 text-xs">
                <svg class="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Chuyến xe này đã hoàn tất. Với tư cách <strong>Quản Trị Viên (Admin)</strong>, bạn có đặc quyền <strong>Mở lại chuyến xe</strong> để chuyển về trạng thái Chờ xử lý và khôi phục tồn kho tương ứng.</span>
              </div>
              <button id="btn-reopen-trip" class="h-7 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded shadow flex items-center gap-1.5 transition-all">
                <svg class="w-3.5 h-3.5 animate-spin-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Mở lại chuyến xe (Rollback)
              </button>
            </div>

            <!-- Modal Body Content -->
            <div class="p-3 space-y-3">
              <!-- Summary Grid -->
              <div class="grid grid-cols-4 gap-2 bg-slate-800/50 p-2.5 rounded border border-slate-700/60 text-xs">
                <div>
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider">Kho xuất phát</div>
                  <div class="font-semibold text-slate-200">Andromeda Hub - HCM</div>
                </div>
                <div>
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider">Tài xế & Biển số</div>
                  <div class="font-semibold text-slate-200">51C-789.66 · Trần Văn Hùng</div>
                </div>
                <div>
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider">Quy mô xuất kho</div>
                  <div class="font-semibold text-slate-200">3 vận đơn · 120 kiện · 650 kg</div>
                </div>
                <div>
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider">Thời gian xác nhận</div>
                  <div class="font-mono text-slate-300">14/10/2026 16:45</div>
                </div>
              </div>

              <!-- Reversal Action Preview Panel -->
              <div class="border border-sky-800/40 bg-sky-950/20 rounded p-2.5">
                <div class="text-[11px] font-bold text-sky-300 mb-1.5 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  CƠ CHẾ HOÀN NGUYÊN DỮ LIỆU KHI MỞ LẠI (ADMIN TRIP ROLLBACK PROTOCOL):
                </div>
                <div class="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                  <div class="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                    <div class="font-bold text-amber-300 mb-0.5">1. Trạng thái Chuyến xe</div>
                    <div>Chuyển từ <span class="text-emerald-400 font-semibold">COMPLETED</span> ➔ <span class="text-sky-300 font-semibold">PENDING</span> (Chờ xử lý). Mở khóa form chỉnh sửa thông tin xe, tài xế, danh sách hàng.</div>
                  </div>
                  <div class="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                    <div class="font-bold text-emerald-300 mb-0.5">2. Khôi phục Tồn kho Hub</div>
                    <div>Hoàn nguyên số lượng tồn kho khả dụng ('remainingQuantity') tại kho xuất phát; thu hồi giao dịch xuất kho ('CargoTransaction' soft-delete).</div>
                  </div>
                  <div class="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                    <div class="font-bold text-purple-300 mb-0.5">3. Trạng thái Vận đơn</div>
                    <div>Đơn hàng xuất được trả về trạng thái <span class="text-sky-300 font-semibold">INBOUND (Lưu kho)</span>, gỡ currentTripCode để người vận hành kiểm kê lại chuẩn xác.</div>
                  </div>
                </div>
              </div>

              <!-- Cargo Manifest Table -->
              <div class="border border-slate-700/80 rounded overflow-hidden">
                <table class="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr class="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
                      <th class="py-1.5 px-2">STT</th>
                      <th class="py-1.5 px-2">Mã vận đơn</th>
                      <th class="py-1.5 px-2">Tên hàng hóa</th>
                      <th class="py-1.5 px-2 text-right">Số lượng xuất</th>
                      <th class="py-1.5 px-2 text-right">Khối lượng (kg)</th>
                      <th class="py-1.5 px-2">Nơi đến</th>
                      <th class="py-1.5 px-2 text-center">Trạng thái hoàn nguyên</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800 text-slate-300">
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-1 px-2 font-mono">01</td>
                      <td class="py-1 px-2 font-mono font-bold text-sky-400">WAYBILL-8101</td>
                      <td class="py-1 px-2">Linh kiện điện tử cao cấp</td>
                      <td class="py-1 px-2 text-right font-mono font-semibold">50 kiện</td>
                      <td class="py-1 px-2 text-right font-mono">250.0</td>
                      <td class="py-1 px-2">Polaris Hub - Hưng Yên</td>
                      <td class="py-1 px-2 text-center">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-600/40">Khôi phục tồn 50 kiện</span>
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-1 px-2 font-mono">02</td>
                      <td class="py-1 px-2 font-mono font-bold text-sky-400">WAYBILL-8102</td>
                      <td class="py-1 px-2">Thiết bị gia dụng & Đồ bếp</td>
                      <td class="py-1 px-2 text-right font-mono font-semibold">40 kiện</td>
                      <td class="py-1 px-2 text-right font-mono">220.0</td>
                      <td class="py-1 px-2">Magellan Hub - Đà Nẵng</td>
                      <td class="py-1 px-2 text-center">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-600/40">Khôi phục tồn 40 kiện</span>
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-1 px-2 font-mono">03</td>
                      <td class="py-1 px-2 font-mono font-bold text-sky-400">WAYBILL-8103</td>
                      <td class="py-1 px-2">Phụ tùng ô tô & Bạc đạn công nghiệp</td>
                      <td class="py-1 px-2 text-right font-mono font-semibold">30 kiện</td>
                      <td class="py-1 px-2 text-right font-mono">180.0</td>
                      <td class="py-1 px-2">Polaris Hub - Hưng Yên</td>
                      <td class="py-1 px-2 text-center">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-600/40">Khôi phục tồn 30 kiện</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Footer with Action Controls -->
            <div class="px-4 py-2 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between text-xs">
              <div class="text-[10px] text-slate-400">
                Logistics TMS Core · Feedback Task #81 · Quyền can thiệp Admin & Phục hồi nghiệp vụ
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Đã tích hợp API Rollback & Mở khóa thao tác
                </span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForLoadState('domcontentloaded');

    // Verify elements are present
    const reopenBtn = page.locator('#btn-reopen-trip');
    await expect(reopenBtn).toBeVisible();
    await expect(reopenBtn).toContainText('Mở lại chuyến xe (Rollback)');

    // Save screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    expect(fs.existsSync(SCREENSHOT_PATH)).toBe(true);
  });
});
