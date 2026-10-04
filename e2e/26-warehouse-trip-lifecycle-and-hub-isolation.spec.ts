/**
 * e2e/26-warehouse-trip-lifecycle-and-hub-isolation.spec.ts
 *
 * Test E2E Toàn diện: Vòng đời chuyến xe (SD), luân chuyển liên Hub và cô lập dữ liệu Kho
 *
 * Kiểm tra trọn vẹn chu trình và các lỗi nghiệp vụ đã xảy ra:
 *  1. [Kho HCM] Tạo 3 chuyến xe nhập kho (SD1, SD2, SD3), mỗi chuyến có 3 đơn hàng nội bộ.
 *  2. [Cô lập dữ liệu] Kho Hưng Yên KHÔNG thấy bất kỳ chuyến xe hoặc đơn hàng nội bộ nào của HCM.
 *  3. [Kho HCM] Tạo phiếu xuất kho luân chuyển đến Hưng Yên (SD4) với xe 51H-99999, điểm giao Hub Hưng Yên.
 *  4. [LỖI 1] Đơn & Chuyến xuất kho của HCM KHÔNG ĐƯỢC xuất hiện ở mục Nhập kho của HCM.
 *  5. [LỖI 2] Kho Hưng Yên PHẢI THẤY chuyến xe và đơn hàng ở mục Nhập kho (Chờ xử lý / PENDING_INBOUND).
 *  6. [Kho Hưng Yên] Tiếp nhận & kiểm đếm nhập kho (PNK-HYN), trạm dừng Hưng Yên = Đã xử lý, hàng Lưu kho tại Hưng Yên.
 *  7. [Browser UI] Kiểm tra thực tế trên giao diện Playwright (Nhập kho HCM, Xuất kho HCM, Nhập kho Hưng Yên).
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginAs, clearSession } from './helpers/auth';

const API = `${process.env.API_URL ?? 'http://localhost:4001'}/api/v1`;
const PASSWORD = 'secret';
const ACC = {
  admin: 'lyquangthai1993+1@gmail.com',
  whHCM: 'lyquangthai1993+6@gmail.com', // Hub 1: Andromeda Hub - HCM
  whHYN: 'lyquangthai1993+4@gmail.com', // Hub 3: Polaris Hub - Hưng Yên
  whDAD: 'lyquangthai1993+5@gmail.com' // Hub 2: Magellan Hub - Đà Nẵng
};

const HUB = { HCM: 1, DAD: 2, HYN: 3 };

type Json = Record<string, any>;
const unwrap = (j: Json) => (j && typeof j === 'object' && 'data' in j ? j.data : j);

const tokens: Record<string, string> = {};

const RUN = Date.now().toString().slice(-4);

// Shared state between serial tests
const testState: {
  initialHcmInboundTotal: number;
  hcmIntakeTrips: string[];
  hcmOrders: Json[];
  transferTripCode?: string;
  transferOrderIds: number[];
  transferLicensePlate: string;
} = {
  initialHcmInboundTotal: 0,
  hcmIntakeTrips: [],
  hcmOrders: [],
  transferOrderIds: [],
  transferLicensePlate: `51H-9${RUN}9`
};

async function login(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/email/login`, {
    data: { email, password: PASSWORD }
  });
  expect(res.status(), `login ${email}`).toBeLessThan(300);
  const d = unwrap(await res.json());
  return d.token as string;
}

const auth = (key: keyof typeof ACC) => ({ Authorization: `Bearer ${tokens[key]}` });

async function api(
  request: APIRequestContext,
  method: 'get' | 'post' | 'patch',
  url: string,
  who: keyof typeof ACC,
  data?: unknown
) {
  const res = await request[method](`${API}${url}`, { headers: auth(who), data });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), body, data: unwrap(body) };
}

test.describe.serial('Vòng đời chuyến xe (SD), luân chuyển liên Hub & Cô lập dữ liệu Kho', () => {
  test.describe.configure({ retries: 0 });

  test.beforeAll(async ({ request }) => {
    // Authenticate both warehouse accounts
    tokens.whHCM = await login(request, ACC.whHCM);
    tokens.whHYN = await login(request, ACC.whHYN);
    tokens.admin = await login(request, ACC.admin);

    const initKpi = await api(request, 'get', '/warehouse/kpi', 'whHCM');
    testState.initialHcmInboundTotal = initKpi.data?.inboundTotal ?? 0;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 1: KHO HCM TẠO 3 CHUYẾN XE NHẬP KHO (SD1, SD2, SD3)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 1: Kho HCM tạo 3 chuyến xe nhập kho (tổng 9 đơn nội bộ) và lưu kho thành công', async ({
    request
  }) => {
    const intakeVehicles = [
      { plate: `51C-1${RUN}1`, driver: 'Nguyễn Văn Nhập 1' },
      { plate: `51D-2${RUN}2`, driver: 'Trần Văn Nhập 2' },
      { plate: `51E-3${RUN}3`, driver: 'Lê Văn Nhập 3' }
    ];

    for (let t = 0; t < intakeVehicles.length; t++) {
      const v = intakeVehicles[t];
      const batchPayload = {
        licensePlate: v.plate,
        driverName: v.driver,
        receiveDate: new Date().toISOString().split('T')[0],
        items: [
          {
            orderCode: `HCM-${RUN}-T${t + 1}-001`,
            goodsDescription: `Hàng linh kiện máy tính Lô ${t + 1}A`,
            totalQuantity: 3,
            totalWeight: 15,
            totalVolume: 0.25,
            initialStatus: 'INBOUND'
          },
          {
            orderCode: `HCM-${RUN}-T${t + 1}-002`,
            goodsDescription: `Hàng thiết bị điện tử Lô ${t + 1}B`,
            totalQuantity: 5,
            totalWeight: 25,
            totalVolume: 0.35,
            initialStatus: 'INBOUND'
          },
          {
            orderCode: `HCM-${RUN}-T${t + 1}-003`,
            goodsDescription: `Hàng gia dụng cao cấp Lô ${t + 1}C`,
            totalQuantity: 7,
            totalWeight: 35,
            totalVolume: 0.45,
            initialStatus: 'INBOUND'
          }
        ]
      };

      const res = await api(
        request,
        'post',
        '/warehouse/inbound/batch-create',
        'whHCM',
        batchPayload
      );
      expect(res.status, `Tạo xe nhập ${v.plate}`).toBe(201);
      expect(res.data.tripCode, 'Mã chuyến xe nhập dạng SD').toMatch(/^SD\d+/);
      expect(res.data.orders.length).toBe(3);

      testState.hcmIntakeTrips.push(res.data.tripCode);
      testState.hcmOrders.push(...res.data.orders);
    }

    expect(testState.hcmOrders.length).toBe(9);

    // Kiểm tra danh sách Nhập kho của HCM (flow=INBOUND): thấy đủ 9 đơn lưu kho
    const hcmOrdersRes = await api(
      request,
      'get',
      '/warehouse/orders?flow=INBOUND&limit=50',
      'whHCM'
    );
    expect(hcmOrdersRes.status).toBe(200);
    const visibleOrders: Json[] = Array.isArray(hcmOrdersRes.data)
      ? hcmOrdersRes.data
      : (hcmOrdersRes.data?.data ?? []);

    expect(visibleOrders.length).toBeGreaterThanOrEqual(9);
    for (const o of testState.hcmOrders) {
      const match = visibleOrders.find((vo) => vo.id === o.id);
      expect(match, `Đơn ${o.orderCode} phải có mặt ở kho HCM`).toBeDefined();
      expect(match?.hubStatus, `Đơn ${o.orderCode} trạng thái Lưu kho`).toBe('INBOUND');
    }

    // Kiểm tra KPI kho HCM
    const hcmKpi = await api(request, 'get', '/warehouse/kpi', 'whHCM');
    expect(hcmKpi.status).toBe(200);
    expect(hcmKpi.data.inboundTotal).toBeGreaterThanOrEqual(9);
    expect(hcmKpi.data.storedInbound).toBeGreaterThanOrEqual(9);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 2: CÔ LẬP DỮ LIỆU - KHO HƯNG YÊN HOÀN TOÀN KHÔNG THẤY HÀNG CỦA HCM
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 2: Kho Hưng Yên KHÔNG thấy bất kỳ chuyến xe hoặc đơn hàng nội bộ nào của HCM', async ({
    request
  }) => {
    // 1. Chuyến xe nhập kho của Hưng Yên phải rỗng (0 chuyến)
    const hyTripsRes = await api(request, 'get', '/warehouse/inbound-trips', 'whHYN');
    expect(hyTripsRes.status).toBe(200);
    const hyTrips: Json[] = Array.isArray(hyTripsRes.data)
      ? hyTripsRes.data
      : (hyTripsRes.data?.data ?? []);
    const leakedHcmTrips = hyTrips.filter((t) => testState.hcmIntakeTrips.includes(t.tripCode));
    expect(leakedHcmTrips.length, 'Hưng Yên KHÔNG được thấy chuyến nhập nội bộ của HCM').toBe(0);

    // 2. Danh sách đơn hàng nhập kho của Hưng Yên (flow=INBOUND) phải rỗng
    const hyInboundOrders = await api(
      request,
      'get',
      '/warehouse/orders?flow=INBOUND&limit=50',
      'whHYN'
    );
    expect(hyInboundOrders.status).toBe(200);
    const hyOrders: Json[] = Array.isArray(hyInboundOrders.data)
      ? hyInboundOrders.data
      : (hyInboundOrders.data?.data ?? []);
    const leakedOrders = hyOrders.filter((o) => testState.hcmOrders.some((ho) => ho.id === o.id));
    expect(leakedOrders.length, 'Hưng Yên KHÔNG được thấy đơn hàng lưu kho nội bộ của HCM').toBe(0);

    // 3. Danh sách xuất kho của Hưng Yên (flow=OUTBOUND) cũng không thấy đơn của HCM
    const hyOutboundOrders = await api(
      request,
      'get',
      '/warehouse/orders?flow=OUTBOUND&limit=50',
      'whHYN'
    );
    expect(hyOutboundOrders.status).toBe(200);
    const hyOutRows: Json[] = Array.isArray(hyOutboundOrders.data)
      ? hyOutboundOrders.data
      : (hyOutboundOrders.data?.data ?? []);
    const leakedOutOrders = hyOutRows.filter((o) =>
      testState.hcmOrders.some((ho) => ho.id === o.id)
    );
    expect(leakedOutOrders.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 3: KHO HCM TẠO PHIẾU XUẤT KHO LUÂN CHUYỂN ĐẾN HƯNG YÊN (SD TRANSFER)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 3: Kho HCM xuất luân chuyển 3 đơn sang Hưng Yên (Hub 3) sinh chuyến TRANSFER và trạm dừng', async ({
    request
  }) => {
    // Chọn 3 đơn từ chuyến xe thứ 3 để xuất luân chuyển
    const targetOrders = testState.hcmOrders.slice(6, 9);
    testState.transferOrderIds = targetOrders.map((o) => o.id);

    // Giả lập đúng payload gửi từ giao diện Mode 1 (chọn điểm giao Hub 3 trên từng dòng)
    const outboundPayload = {
      mode: 'CUSTOMER', // Mô phỏng giao diện Mode 1 gửi mode CUSTOMER nhưng từng dòng chọn Hub 3
      licensePlate: testState.transferLicensePlate,
      driverName: 'Nguyễn Văn Luân Chuyển',
      destinationHubId: HUB.HYN,
      items: targetOrders.map((o) => ({
        orderId: o.id,
        quantityToExport: Number(o.totalQuantity),
        weightToExport: Number(o.totalWeight),
        volumeToExport: Number(o.totalVolume),
        destinationHubId: HUB.HYN,
        deliveryMode: 'HUB_L1',
        deliveryAddress: 'Polaris Hub - Hưng Yên'
      }))
    };

    const res = await api(request, 'post', '/warehouse/outbound/confirm', 'whHCM', outboundPayload);
    expect(res.status, 'Xuất kho luân chuyển thành công').toBe(200);
    expect(res.data.tripCode, 'Sinh mã chuyến xe xuất dạng SD').toMatch(/^SD\d+/);
    testState.transferTripCode = res.data.tripCode;

    // Kiểm tra TripEntity vừa tạo trong DB
    expect(res.data.trip.type, 'Chuyến xe phải có type là TRANSFER').toBe('TRANSFER');
    expect(res.data.trip.originHubId, 'Điểm xuất phát là Hub HCM (1)').toBe(HUB.HCM);
    expect(res.data.trip.destinationHubId, 'Điểm đến là Hub Hưng Yên (3)').toBe(HUB.HYN);
    expect(res.data.trip.status).toBe('IN_TRANSIT');

    // Kiểm tra Manifest trạm dừng của chuyến xe xuất
    const mf = await api(
      request,
      'get',
      `/warehouse/trips/${encodeURIComponent(testState.transferTripCode!)}/manifest`,
      'whHCM'
    );
    expect(mf.status).toBe(200);
    expect(mf.data.stops.length, 'Phải có 2 trạm dừng: HCM và Hưng Yên').toBeGreaterThanOrEqual(2);

    const hcmStop = mf.data.stops.find((s: any) => s.hubId === HUB.HCM);
    expect(hcmStop, 'Trạm dừng HCM phải tồn tại').toBeDefined();
    expect(hcmStop.status, 'Trạm dừng HCM xuất hàng xong phải COMPLETED').toBe('COMPLETED');
    expect(hcmStop.stopType).toBe('ORIGIN');

    const hynStop = mf.data.stops.find((s: any) => s.hubId === HUB.HYN);
    expect(hynStop, 'Trạm dừng Hưng Yên phải được tạo tự động').toBeDefined();
    expect(hynStop.status, 'Trạm dừng Hưng Yên chờ nhận hàng phải PENDING').toBe('PENDING');
    expect(hynStop.stopType).toBe('DESTINATION');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 4: KIỂM TRA LỖI 1 - ĐƠN/CHUYẾN XUẤT BIẾN MẤT KHỎI NHẬP KHO CỦA HCM
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 4: [LỖI 1] Đơn & Chuyến xe đã xuất kho KHÔNG ĐƯỢC xuất hiện ở mục Nhập kho của HCM', async ({
    request
  }) => {
    // 1. Kiểm tra danh sách Nhập kho của HCM (flow=INBOUND):
    // 3 đơn đã xuất (COMPLETED_INBOUND) PHẢI BIẾN MẤT, chỉ còn lại 6 đơn lưu kho
    const hcmInbound = await api(
      request,
      'get',
      '/warehouse/orders?flow=INBOUND&limit=50',
      'whHCM'
    );
    expect(hcmInbound.status).toBe(200);
    const inOrders: Json[] = Array.isArray(hcmInbound.data)
      ? hcmInbound.data
      : (hcmInbound.data?.data ?? []);

    for (const exportedId of testState.transferOrderIds) {
      const found = inOrders.find((o) => o.id === exportedId);
      expect(
        found,
        `Đơn ${exportedId} đã xuất kho tuyệt đối KHÔNG ĐƯỢC xuất hiện ở mục Nhập kho của HCM`
      ).toBeUndefined();
    }

    // Không đơn nào trong danh sách Nhập kho có trạng thái 'COMPLETED_INBOUND'
    const dispatchedInInbound = inOrders.filter((o) => o.hubStatus === 'COMPLETED_INBOUND');
    expect(dispatchedInInbound.length, 'Không có đơn Đã xuất kho nào lọt vào Nhập kho').toBe(0);

    // 2. Chuyến xe xuất TRANSFER (SD4) KHÔNG ĐƯỢC nằm trong Inbound Trips của HCM
    const hcmInboundTrips = await api(request, 'get', '/warehouse/inbound-trips', 'whHCM');
    expect(hcmInboundTrips.status).toBe(200);
    const inTrips: Json[] = Array.isArray(hcmInboundTrips.data)
      ? hcmInboundTrips.data
      : (hcmInboundTrips.data?.data ?? []);
    const foundTransferTrip = inTrips.find((t) => t.tripCode === testState.transferTripCode);
    expect(
      foundTransferTrip,
      'Chuyến xe xuất SD luân chuyển KHÔNG ĐƯỢC hiển thị ở mục Chuyến xe nhập kho của HCM'
    ).toBeUndefined();

    // 3. KPI Nhập kho của HCM: inboundTotal chỉ đếm 6 đơn trong kho
    const hcmKpi = await api(request, 'get', '/warehouse/kpi', 'whHCM');
    expect(hcmKpi.status).toBe(200);
    expect(hcmKpi.data.inboundTotal, 'inboundTotal của HCM phải trừ đi 3 đơn đã xuất').toBe(
      testState.initialHcmInboundTotal + 6
    );
    expect(
      hcmKpi.data.completedOutbound,
      'completedOutbound phải ghi nhận 3 đơn đã xuất'
    ).toBeGreaterThanOrEqual(3);

    // 4. Ở mục Xuất kho của HCM (flow=OUTBOUND): 3 đơn đã xuất PHẢI CÓ MẶT ở lịch sử xuất
    const hcmOutbound = await api(
      request,
      'get',
      '/warehouse/orders?flow=OUTBOUND&limit=50',
      'whHCM'
    );
    expect(hcmOutbound.status).toBe(200);
    const outOrders: Json[] = Array.isArray(hcmOutbound.data)
      ? hcmOutbound.data
      : (hcmOutbound.data?.data ?? []);
    for (const exportedId of testState.transferOrderIds) {
      const found = outOrders.find((o) => o.id === exportedId);
      expect(found, `Đơn ${exportedId} phải có mặt ở mục Xuất kho của HCM`).toBeDefined();
      expect(found?.hubStatus, 'Trạng thái tại kho HCM là COMPLETED_INBOUND (Đã xuất kho)').toBe(
        'COMPLETED_INBOUND'
      );
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 5: KIỂM TRA LỖI 2 - KHO HƯNG YÊN PHẢI THẤY ĐẦY ĐỦ CHUYẾN XE VÀ ĐƠN
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 5: [LỖI 2] Kho Hưng Yên PHẢI THẤY chuyến xe và các đơn hàng ở mục Nhập kho (Chờ xử lý)', async ({
    request
  }) => {
    // 1. Kiểm tra Inbound Trips của Hưng Yên: THẤY NGAY chuyến xe luân chuyển
    const hyTripsRes = await api(request, 'get', '/warehouse/inbound-trips', 'whHYN');
    expect(hyTripsRes.status).toBe(200);
    const hyTrips: Json[] = Array.isArray(hyTripsRes.data)
      ? hyTripsRes.data
      : (hyTripsRes.data?.data ?? []);
    const transferTrip = hyTrips.find((t) => t.tripCode === testState.transferTripCode);
    expect(
      transferTrip,
      `Hưng Yên phải thấy chuyến xe luân chuyển ${testState.transferTripCode}`
    ).toBeDefined();
    expect(transferTrip?.status).toBe('PENDING');
    expect(transferTrip?.hubStatus).toBe('PENDING');

    // 2. Kiểm tra danh sách đơn Nhập kho của Hưng Yên (flow=INBOUND):
    // Phải thấy 3 đơn hàng đang trên đường đến với trạng thái PENDING_INBOUND (Chờ nhập kho)
    const hyInboundOrders = await api(
      request,
      'get',
      '/warehouse/orders?flow=INBOUND&limit=50',
      'whHYN'
    );
    expect(hyInboundOrders.status).toBe(200);
    const hyOrders: Json[] = Array.isArray(hyInboundOrders.data)
      ? hyInboundOrders.data
      : (hyInboundOrders.data?.data ?? []);

    for (const expId of testState.transferOrderIds) {
      const found = hyOrders.find((o) => o.id === expId);
      expect(found, `Hưng Yên phải thấy đơn ${expId} trong danh sách Nhập kho`).toBeDefined();
      expect(
        found?.hubStatus,
        'Trạng thái góc nhìn Hưng Yên là PENDING_INBOUND (Chờ nhập kho)'
      ).toBe('PENDING_INBOUND');
      expect(found?.currentTripCode).toBe(testState.transferTripCode);
    }

    // 3. Kiểm tra Manifest từ góc nhìn của Hưng Yên
    const hyManifest = await api(
      request,
      'get',
      `/warehouse/trips/${encodeURIComponent(testState.transferTripCode!)}/manifest`,
      'whHYN'
    );
    expect(hyManifest.status).toBe(200);
    expect(
      hyManifest.data.currentHubStatus,
      'Trạng thái chuyến tại Hưng Yên là PENDING (Chờ xử lý)'
    ).toBe('PENDING');
    expect(hyManifest.data.lines.length).toBe(3);
    for (const line of hyManifest.data.lines) {
      expect(line.isForCurrentHub, 'Dòng hàng phải đánh dấu đích là kho này (Hưng Yên)').toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 6: KHO HƯNG YÊN TIẾP NHẬN & KIỂM ĐẾM NHẬP KHO (INBOUND TALLY)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 6: Kho Hưng Yên tiếp nhận kiểm đếm nhập kho, hoàn tất trạm dừng và ghi nhận Lưu kho', async ({
    request
  }) => {
    // Hưng Yên xác nhận dỡ hàng từ chuyến xe luân chuyển
    const tallyPayload = {
      tripCode: testState.transferTripCode,
      vehicleLicensePlate: testState.transferLicensePlate,
      driverName: 'Nguyễn Văn Luân Chuyển',
      targetStatus: 'INBOUND',
      orders: testState.transferOrderIds.map((id) => ({
        id,
        orderCode: testState.hcmOrders.find((o) => o.id === id)?.orderCode,
        totalQuantity: testState.hcmOrders.find((o) => o.id === id)?.totalQuantity,
        totalWeight: testState.hcmOrders.find((o) => o.id === id)?.totalWeight,
        totalVolume: testState.hcmOrders.find((o) => o.id === id)?.totalVolume
      }))
    };

    const confirmRes = await api(
      request,
      'post',
      '/warehouse/inbound/confirm',
      'whHYN',
      tallyPayload
    );
    expect(confirmRes.status, 'Hưng Yên tiếp nhận nhập kho thành công').toBe(200);
    expect(confirmRes.data.invoiceCode, 'Hưng Yên phải sinh phiếu nhập kho PNK-HYN').toMatch(
      /^PNK-HYN-/
    );

    // Kiểm tra Manifest sau khi Hưng Yên nhập kho:
    const mfAfter = await api(
      request,
      'get',
      `/warehouse/trips/${encodeURIComponent(testState.transferTripCode!)}/manifest`,
      'whHYN'
    );
    expect(mfAfter.status).toBe(200);
    expect(
      mfAfter.data.currentHubStatus,
      'Trạm dừng Hưng Yên phải chuyển thành COMPLETED (Đã xử lý)'
    ).toBe('COMPLETED');

    // Kiểm tra trạng thái đơn hàng tại Hưng Yên:
    // Chuyển thành INBOUND (Lưu kho tại Hưng Yên) và có tồn kho khả dụng
    const hyOrdersAfter = await api(
      request,
      'get',
      '/warehouse/orders?flow=INBOUND&limit=50',
      'whHYN'
    );
    expect(hyOrdersAfter.status).toBe(200);
    const hyStoredList: Json[] = Array.isArray(hyOrdersAfter.data)
      ? hyOrdersAfter.data
      : (hyOrdersAfter.data?.data ?? []);

    for (const id of testState.transferOrderIds) {
      const stored = hyStoredList.find((o) => o.id === id);
      expect(stored, `Đơn ${id} phải có mặt trong kho lưu Hưng Yên`).toBeDefined();
      expect(stored?.hubStatus, 'Trạng thái tại Hưng Yên là INBOUND (Lưu kho)').toBe('INBOUND');
      expect(stored?.hubStock, 'Tồn kho tại Hưng Yên phải lớn hơn 0').toBeGreaterThan(0);
    }

    // Kiểm tra trạng thái đơn hàng tại HCM: Vẫn là COMPLETED_INBOUND (Đã xuất kho, không bị đè trạng thái)
    const hcmCheck = await api(request, 'get', '/warehouse/orders?flow=OUTBOUND&limit=50', 'whHCM');
    const hcmOutList: Json[] = Array.isArray(hcmCheck.data)
      ? hcmCheck.data
      : (hcmCheck.data?.data ?? []);
    for (const id of testState.transferOrderIds) {
      const hcmOrder = hcmOutList.find((o) => o.id === id);
      expect(hcmOrder?.hubStatus, 'Trạng thái tại HCM vẫn là COMPLETED_INBOUND (Đã xuất kho)').toBe(
        'COMPLETED_INBOUND'
      );
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GIAI ĐOẠN 7: KIỂM TRA GIAO DIỆN PLAYWRIGHT BROWSER (UI VALIDATION)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Giai đoạn 7: Kiểm tra giao diện người dùng trên Playwright Browser', async ({ page }) => {
    // 1. Đăng nhập tài khoản HCM và kiểm tra trang Nhập kho
    await loginAs(page, {
      email: ACC.whHCM,
      password: PASSWORD,
      role: 'WAREHOUSE_MANAGER',
      expectedLandingPath: '/dashboard/overview'
    });

    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');

    // Chờ bảng dữ liệu tải
    await expect(page.locator('h1')).toContainText('Nhập kho');

    // Kiểm tra tab "Tất cả": phải hiển thị số lượng (không tính 3 đơn đã xuất)
    const expectedHcmCount = testState.initialHcmInboundTotal + 6;
    const allTab = page.getByRole('button', { name: /^Tất cả/ });
    await expect(allTab).toContainText(`(${expectedHcmCount})`);

    // Bảng dữ liệu tuyệt đối không được có badge "Đã xuất kho"
    const completedBadge = page.locator('span:has-text("Đã xuất kho")');
    expect(await completedBadge.count()).toBe(0);

    // Xe 51H-99999 không được xuất hiện ở trang Nhập kho
    const transferPlateOnInbound = page.locator(`text=${testState.transferLicensePlate}`);
    expect(await transferPlateOnInbound.count()).toBe(0);

    // 2. Chuyển sang trang Xuất kho của HCM
    await page.goto('/dashboard/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Xuất kho');

    // Ở trang Xuất kho, xe luân chuyển 51H-99999 PHẢI XUẤT HIỆN
    const transferPlateOnOutbound = page.locator(`text=${testState.transferLicensePlate}`);
    await expect(transferPlateOnOutbound.first()).toBeVisible();

    // 3. Đăng xuất và đăng nhập tài khoản Hưng Yên
    await clearSession(page);
    await loginAs(page, {
      email: ACC.whHYN,
      password: PASSWORD,
      role: 'WAREHOUSE_MANAGER',
      expectedLandingPath: '/dashboard/overview'
    });

    await page.goto('/dashboard/warehouse/inbound');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Nhập kho');

    // Kiểm tra tab "Đã nhập kho" của Hưng Yên: phải có xe luân chuyển vừa tiếp nhận
    const storedTab = page.getByRole('button', { name: /^Đã nhập kho/ });
    await storedTab.click();
    await page.waitForTimeout(600);

    // Chuyến xe luân chuyển và biển số phải hiển thị với trạng thái "Đã xử lý"
    await expect(page.locator(`text=${testState.transferLicensePlate}`).first()).toBeVisible();
    await expect(page.locator('text=Đã xử lý').first()).toBeVisible();

    // Mở rộng tất cả xe để kiểm tra các dòng đơn con bên trong
    const expandAllBtn = page.getByRole('button', { name: 'Mở rộng tất cả' });
    await expandAllBtn.click();
    await page.waitForTimeout(600);

    // Phải thấy các badge "LƯU KHO" của từng đơn hàng tại kho Hưng Yên
    const storedBadges = page.locator('span:has-text("LƯU KHO")');
    expect(await storedBadges.count()).toBeGreaterThanOrEqual(3);
  });
});
