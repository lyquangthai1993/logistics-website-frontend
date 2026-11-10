import * as XLSX from 'xlsx';
import { extractVietnamProvince } from './vietnam-provinces';

export interface StandardizedInboundRow {
  stt: number;
  orderCode: string;
  pickupAddress: string;
  goodsDescription: string;
  totalQuantity: number;
  totalWeight: number;
  totalVolume: number;
  deliveryAddress: string;
  province: string;
  accompanyingDocs: string;
  notes: string;
  dispatcherName?: string;
  expectedInboundTime?: string;
  destinationWarehouse?: string;
}

export interface DispatchSheetMeta {
  date: string;
  driverName: string;
  licensePlate: string;
}

export interface DispatchParsedSheetResult {
  sheetName: string;
  meta: DispatchSheetMeta;
  rows: StandardizedInboundRow[];
  totalPackages: number;
  totalWeight: number;
  totalVolume: number;
}

export interface DispatchWorkbookInspection {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
  defaultSheetName: string;
  isDispatchFormat: boolean;
}

/**
 * Format Excel serial date (or raw string/number) to DD/MM/YYYY
 */
export function formatExcelDate(rawDate: unknown): string {
  if (!rawDate) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }

  // If already formatted like DD/MM/YYYY or DD-MM-YYYY
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}$/.test(trimmed)) {
      return trimmed.replace(/[-.]/g, '/');
    }
    const isoMatch = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }

  // If number (Excel serial date)
  if (typeof rawDate === 'number' || !isNaN(Number(rawDate))) {
    const num = Number(rawDate);
    if (num > 20000 && num < 70000) {
      try {
        const formatted = XLSX.SSF.format('dd/mm/yyyy', num);
        if (formatted && formatted.includes('/')) return formatted;
      } catch {
        // Fallback below
      }
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      const d = String(date.getUTCDate()).padStart(2, '0');
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const y = date.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
  }

  return String(rawDate);
}

/**
 * Quy chuẩn số liệu cố định:
 * - Dấu chấm (.) là phân cách phần nghìn (VD: "2.767" -> 2767, "1.440" -> 1440, "2.767,00" -> 2767)
 * - Dấu phẩy (,) là phân cách phần thập phân (VD: "4,59" -> 4.59, "890,00" -> 890, "0,973" -> 0.973)
 */
export function detectVietnameseNumberLocale(_samples?: unknown[]): boolean {
  return true;
}

/**
 * Chuẩn hóa chuỗi số từ Excel / Clipboard theo quy chuẩn cố định:
 * Chấm (.) là phần nghìn, phẩy (,) là phần thập phân.
 * Triệt tiêu hoàn toàn lỗi nhân 100 ("890,00" -> 89000) và lỗi chia 1000 ("2.767,00" / "1.440" -> 2.767 / 1.44).
 */
export function parseLocalizedNumber(
  raw: unknown,
  _options?: { isVietnameseLocale?: boolean; isWeightKg?: boolean } | boolean
): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!s || s === '-' || s === '.' || s === ',') return 0;

  // Chấm (.) là phần nghìn -> xóa toàn bộ dấu chấm; Phẩy (,) là phần thập phân -> đổi thành dấu chấm cho parseFloat
  const normalized = s.replace(/\./g, '').replace(/,/g, '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Chuẩn hóa số nguyên cho cột Số kiện / Số thùng (mặc định >= 1) theo quy chuẩn:
 * Chấm (.) là phần nghìn, phẩy (,) là phần thập phân (VD: "44,00" -> 44, "1.200" -> 1200).
 */
export function parseLocalizedQuantity(
  raw: unknown,
  _options?: { isVietnameseLocale?: boolean } | boolean,
  fallback = 1
): number {
  if (typeof raw === 'number') {
    const rounded = Math.round(raw);
    return Number.isFinite(rounded) && rounded > 0 ? rounded : fallback;
  }
  const str = String(raw ?? '').trim();
  if (!str) return fallback;

  const num = Math.round(parseLocalizedNumber(str));
  return num > 0 ? num : fallback;
}

/**
 * Kiểm tra xem workbook có phải là file mẫu điều hành gửi sang không
 */
export function isDispatchExcelWorkbook(wb: XLSX.WorkBook): boolean {
  if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) return false;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    for (let r = 0; r < Math.min(data.length, 20); r++) {
      const row = data[r] || [];
      const rowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
      if (
        (rowStr.includes('mã đơn hàng') || rowStr.includes('mã đơn')) &&
        (rowStr.includes('điều hành') ||
          rowStr.includes('địa chỉ lấy hàng') ||
          rowStr.includes('địa chỉ nhận hàng') ||
          rowStr.includes('kho nhập'))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Đọc và phân tích workbook đầu vào
 */
export function inspectDispatchWorkbook(buffer: ArrayBuffer | Uint8Array): DispatchWorkbookInspection {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = wb.SheetNames || [];
  const isDispatchFormat = isDispatchExcelWorkbook(wb);

  // Chọn sheet mặc định: ưu tiên sheet khớp ngày hôm nay hoặc sheet đầu tiên (trừ sheet tổng 'Nhập' nếu có sheet ngày)
  let defaultSheetName = sheetNames[0] || '';
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayPattern = `${dayStr}.${monthStr}`; // vd: 14.10

  const matchedToday = sheetNames.find((s) => s.includes(todayPattern));
  if (matchedToday) {
    defaultSheetName = matchedToday;
  } else if (sheetNames.length > 1 && defaultSheetName.toLowerCase() === 'nhập') {
    defaultSheetName = sheetNames[1];
  }

  return {
    workbook: wb,
    sheetNames,
    defaultSheetName,
    isDispatchFormat,
  };
}

/**
 * Parse một sheet cụ thể trong workbook điều hành thành danh sách chuẩn 11 cột
 */
export function parseDispatchSheet(
  wb: XLSX.WorkBook,
  sheetName: string
): DispatchParsedSheetResult {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    return {
      sheetName,
      meta: { date: formatExcelDate(null), driverName: '', licensePlate: '' },
      rows: [],
      totalPackages: 0,
      totalWeight: 0,
      totalVolume: 0,
    };
  }

  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Tìm dòng header của bảng điều hành (14-16 cột, hỗ trợ cả mẫu KẾ HOẠCH ĐÓNG HÀNG header 2 dòng)
  let headerRowIdx = -1;
  let headerCols: string[] = [];

  for (let r = 0; r < Math.min(data.length, 25); r++) {
    const row = (data[r] || []).map((c) => String(c || '').trim());
    const lowerRow = row.map((c) => c.toLowerCase());
    if (
      lowerRow.some(
        (c) => c.includes('mã đơn hàng') || c.includes('mã đơn') || c.includes('mã vận đơn')
      ) &&
      lowerRow.some(
        (c) =>
          c.includes('địa chỉ lấy hàng') ||
          c.includes('địa chỉ nhận hàng') ||
          c.includes('địa chỉ nhận') ||
          c.includes('điểm bốc hàng') ||
          c.includes('tên hàng') ||
          c.includes('kho nhập')
      )
    ) {
      headerRowIdx = r;
      headerCols = row;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Không tìm thấy header rõ ràng, quét mặc định ở dòng 12 nếu có
    if (data.length > 12) {
      headerRowIdx = 11;
      headerCols = (data[11] || []).map((c) => String(c || '').trim());
    } else {
      headerRowIdx = 0;
      headerCols = (data[0] || []).map((c) => String(c || '').trim());
    }
  }

  // Kiểm tra xem dòng ngay sau header (headerRowIdx + 1) có phải là dòng sub-header gộp (VD: "Số thùng | Số kg | Số khối" dưới cột "Khối lượng") không
  let dataStartRowIdx = headerRowIdx + 1;
  if (headerRowIdx + 1 < data.length) {
    const nextRow = (data[headerRowIdx + 1] || []).map((c) => String(c || '').trim());
    const nextRowLower = nextRow.map((c) => c.toLowerCase());
    const hasSubHeaderKeywords = nextRowLower.some(
      (c) =>
        c.includes('số thùng') ||
        c.includes('số kiện') ||
        c.includes('số lượng') ||
        c.includes('số kg') ||
        c.includes('số khối') ||
        c.includes('số m³') ||
        c.includes('số m3')
    );
    if (hasSubHeaderKeywords) {
      const maxLen = Math.max(headerCols.length, nextRow.length);
      const mergedHeaders: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        mergedHeaders.push(nextRow[i] ? nextRow[i] : headerCols[i] || '');
      }
      headerCols = mergedHeaders;
      dataStartRowIdx = headerRowIdx + 2;
    }
  }

  // Map vị trí các cột dựa vào tiêu đề header (ưu tiên theo thứ tự từ khóa trong patterns)
  const findColIdx = (patterns: string[]) => {
    for (const p of patterns) {
      const pLower = p.toLowerCase();
      const idx = headerCols.findIndex((col) => col.toLowerCase().includes(pLower));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colDate = findColIdx(['ngày tháng', 'ngày cần bốc', 'ngày']);
  const colOrderCode = findColIdx(['mã vận đơn', 'mã đơn hàng', 'mã đơn']);
  const colDispatcher = findColIdx(['điều hành']);
  const colPlate = findColIdx(['biển số xe', 'số xe']);
  const colDriver = findColIdx(['tên tài xế', 'họ tên người nhận', 'tài xế', 'lái xe']);
  const colGoodsName = findColIdx(['tên hàng hóa', 'tên hàng', 'hàng hóa', 'mặt hàng']);
  const colDestWarehouse = findColIdx(['kho nhập']);
  const colExpectedTime = findColIdx(['giờ dự kiến']);
  const colPickupAddr = findColIdx([
    'địa chỉ lấy hàng',
    'địa chỉ nhận hàng',
    'điểm bốc hàng',
    'địa chỉ nhận',
    'địa chỉ lấy',
    'nơi nhận',
  ]);
  const colDeliveryAddr = findColIdx(['địa chỉ giao hàng', 'địa chỉ giao', 'nơi giao']);
  const colProvince = findColIdx(['tỉnh / tp', 'tỉnh/tp', 'đã soạn', 'tỉnh thành']);
  const colQty = findColIdx(['số kiện', 'số thùng', 'số lượng', 'kiện', 'thùng']);
  const colWeight = findColIdx(['số kg', 'trọng lượng', 'khối lượng', 'kg']);
  const colVolume = findColIdx(['số m³', 'số m3', 'số khối', 'thể tích', 'm³', 'm3', 'khối']);
  const colNotes = findColIdx(['ghi chú', 'lưu ý']);

  let detectedDate = '';
  let detectedPlate = '';
  let detectedDriver = '';

  // Quét phần thông tin chung ở các dòng phía trên bảng (r < headerRowIdx)
  for (let r = 0; r < headerRowIdx; r++) {
    const row = data[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'number' && cell > 40000 && cell < 60000 && !detectedDate) {
        detectedDate = formatExcelDate(cell);
      }
      const label = String(cell || '')
        .trim()
        .toLowerCase();
      if (!label) continue;

      // Tìm giá trị ở các ô kế tiếp bên phải (c+1, c+2, c+3)
      let adjacentVal: unknown = '';
      for (let offset = 1; offset <= 3 && c + offset < row.length; offset++) {
        const candidate = row[c + offset];
        if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
          adjacentVal = candidate;
          break;
        }
      }
      if (adjacentVal === '') continue;

      if (
        !detectedDate &&
        (label.includes('ngày/tháng/năm') || label === 'ngày' || label.startsWith('ngày:'))
      ) {
        detectedDate = formatExcelDate(adjacentVal);
      } else if (
        !detectedPlate &&
        (label.includes('biển số xe') || label === 'số xe' || label.startsWith('số xe:'))
      ) {
        detectedPlate = String(adjacentVal).trim();
      } else if (
        !detectedDriver &&
        (label.includes('họ tên người nhận') ||
          label.includes('lái xe') ||
          label.includes('tài xế'))
      ) {
        detectedDriver = String(adjacentVal).trim();
      }
    }
  }

  const rawRows = data.slice(dataStartRowIdx);
  const numberSamples: unknown[] = [];
  for (const row of rawRows) {
    if (!row) continue;
    if (colQty !== -1) numberSamples.push(row[colQty]);
    if (colWeight !== -1) numberSamples.push(row[colWeight]);
    if (colVolume !== -1) numberSamples.push(row[colVolume]);
  }
  const isVietnameseLocale = detectVietnameseNumberLocale(numberSamples);

  const rows: StandardizedInboundRow[] = [];

  for (const row of rawRows) {
    if (!row || row.length === 0) continue;

    const rawOrderCode = colOrderCode !== -1 ? String(row[colOrderCode] || '').trim() : '';
    // Bỏ qua các dòng trống hoàn toàn, dòng tiêu đề phụ hoặc dòng tổng cộng
    if (!rawOrderCode) continue;
    const lowerCode = rawOrderCode.toLowerCase();
    if (
      lowerCode === 'mã đơn hàng' ||
      lowerCode === 'mã vận đơn' ||
      lowerCode.startsWith('tổng') ||
      lowerCode.startsWith('mã chuyến') ||
      lowerCode.startsWith('chuyến xe')
    ) {
      continue;
    }

    // Lọc mã đơn sạch (loại bỏ xuống dòng)
    const orderCode = rawOrderCode.replace(/[\r\n\t]+/g, ' ').trim();

    const rawPickupAddr = colPickupAddr !== -1 ? String(row[colPickupAddr] || '').trim() : '';
    const pickupAddress = rawPickupAddr.replace(/[\r\n\t]+/g, ' ').trim();

    const rawGoods = colGoodsName !== -1 ? String(row[colGoodsName] || '').trim() : '';
    const goodsDescription = rawGoods.replace(/[\r\n\t]+/g, ' ').trim();

    // Số lượng: nếu rỗng, undefined, hoặc <= 0 thì tự động gán là 1 kiện
    const totalQuantity =
      colQty !== -1
        ? parseLocalizedQuantity(row[colQty], { isVietnameseLocale })
        : 1;

    // Số kg
    const totalWeight =
      colWeight !== -1
        ? parseLocalizedNumber(row[colWeight], { isVietnameseLocale, isWeightKg: true })
        : 0;

    // Số m³
    const totalVolume =
      colVolume !== -1
        ? parseLocalizedNumber(row[colVolume], { isVietnameseLocale, isWeightKg: false })
        : 0;

    // Địa chỉ giao
    const rawDeliveryAddr = colDeliveryAddr !== -1 ? String(row[colDeliveryAddr] || '').trim() : '';
    const deliveryAddress = rawDeliveryAddr.replace(/[\r\n\t]+/g, ' ').trim();

    // Bóc tách Tỉnh / Thành phố (ưu tiên cột Tỉnh/Đã soạn nếu có, hoặc bóc từ địa chỉ giao)
    const rawProvinceCell =
      colProvince !== -1
        ? String(row[colProvince] || '')
            .replace(/[\r\n\t]+/g, ' ')
            .trim()
        : '';
    const province =
      extractVietnamProvince(rawProvinceCell) ||
      extractVietnamProvince(deliveryAddress) ||
      rawProvinceCell;

    // Thông tin tài xế và biển số xe
    const rowPlate = colPlate !== -1 ? String(row[colPlate] || '').trim() : '';
    const rowDriver = colDriver !== -1 ? String(row[colDriver] || '').trim() : '';
    if (rowPlate && !detectedPlate) detectedPlate = rowPlate;
    if (rowDriver && !detectedDriver) detectedDriver = rowDriver;

    // Ngày giao nhận
    const rowDateRaw = colDate !== -1 ? row[colDate] : null;
    if (rowDateRaw && !detectedDate) {
      detectedDate = formatExcelDate(rowDateRaw);
    }

    // Thông tin phụ trợ
    const dispatcherName = colDispatcher !== -1 ? String(row[colDispatcher] || '').trim() : '';
    const expectedInboundTime = colExpectedTime !== -1 ? String(row[colExpectedTime] || '').trim() : '';
    const destinationWarehouse = colDestWarehouse !== -1 ? String(row[colDestWarehouse] || '').trim() : '';
    const rawNote =
      colNotes !== -1
        ? String(row[colNotes] || '')
            .replace(/[\r\n\t]+/g, ' ')
            .trim()
        : '';

    // Gộp ghi chú nghiệp vụ
    const noteParts: string[] = [];
    if (rawNote) noteParts.push(rawNote);
    if (expectedInboundTime) noteParts.push(`Về kho: ${expectedInboundTime}`);
    if (dispatcherName) noteParts.push(`ĐH: ${dispatcherName}`);
    const notes = noteParts.join(' | ');

    rows.push({
      stt: rows.length + 1,
      orderCode,
      pickupAddress,
      goodsDescription,
      totalQuantity,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalVolume: Math.round(totalVolume * 1000) / 1000,
      deliveryAddress,
      province,
      accompanyingDocs: '',
      notes,
      dispatcherName,
      expectedInboundTime,
      destinationWarehouse,
    });
  }

  if (!detectedDate) {
    detectedDate = formatExcelDate(null);
  }

  const totalPackages = rows.reduce((sum, r) => sum + r.totalQuantity, 0);
  const totalWeight = Math.round(rows.reduce((sum, r) => sum + r.totalWeight, 0) * 100) / 100;
  const totalVolume = Math.round(rows.reduce((sum, r) => sum + r.totalVolume, 0) * 1000) / 1000;

  return {
    sheetName,
    meta: {
      date: detectedDate,
      driverName: detectedDriver,
      licensePlate: detectedPlate,
    },
    rows,
    totalPackages,
    totalWeight,
    totalVolume,
  };
}

/**
 * Sinh Workbook Excel .xlsx chuẩn 100% giống 'mẫu chuẩn của phần mềm.xlsx'
 */
export function generateStandardExcelWorkbook(
  rows: StandardizedInboundRow[],
  meta: DispatchSheetMeta
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Header 4 dòng đầu
  const aoaData: any[][] = [
    [null, null, 'PHIẾU YÊU CẦU NHẬP KHO', null, null, null, null, 'Ngày', meta.date || formatExcelDate(null)],
    [null, null, 'LÁI XE :', meta.driverName || ''],
    [null, null, 'SỐ XE:', meta.licensePlate || ''],
    [
      'STT',
      'Mã vận đơn',
      'Địa chỉ nhận',
      'Tên hàng',
      'Số kiện',
      'Số KG',
      'Số m³',
      'Địa chỉ giao',
      'Tỉnh / TP',
      'Chứng từ',
      'Ghi chú',
    ],
  ];

  // Thêm các dòng dữ liệu từ dòng 5
  rows.forEach((r, idx) => {
    aoaData.push([
      idx + 1,
      r.orderCode,
      r.pickupAddress,
      r.goodsDescription,
      r.totalQuantity,
      r.totalWeight,
      r.totalVolume,
      r.deliveryAddress,
      r.province,
      r.accompanyingDocs || '',
      r.notes || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Hợp nhất ô C1:G1 (Merge cells C1 to G1) như file mẫu chuẩn
  ws['!merges'] = [{ s: { c: 2, r: 0 }, e: { c: 6, r: 0 } }];

  // Độ rộng các cột
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã vận đơn
    { wch: 32 }, // Địa chỉ nhận
    { wch: 26 }, // Tên hàng
    { wch: 10 }, // Số kiện
    { wch: 12 }, // Số KG
    { wch: 10 }, // Số m³
    { wch: 45 }, // Địa chỉ giao
    { wch: 18 }, // Tỉnh / TP
    { wch: 14 }, // Chứng từ
    { wch: 30 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PhieuYeuCauNhapKho');
  return wb;
}

/**
 * Sinh chuỗi TSV để sao chép vào Clipboard (Ctrl+V tương thích hoàn toàn mapPastedColsToRow)
 */
export function generateClipboardTsv(
  rows: StandardizedInboundRow[],
  includeHeader = true
): string {
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(
      [
        'STT',
        'Mã vận đơn',
        'Địa chỉ nhận',
        'Tên hàng',
        'Số kiện',
        'Số KG',
        'Số m³',
        'Địa chỉ giao',
        'Tỉnh / TP',
        'Chứng từ',
        'Ghi chú',
      ].join('\t')
    );
  }

  rows.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        r.orderCode,
        r.pickupAddress,
        r.goodsDescription,
        String(r.totalQuantity),
        String(r.totalWeight).replace('.', ','),
        String(r.totalVolume).replace('.', ','),
        r.deliveryAddress,
        r.province,
        r.accompanyingDocs || '',
        r.notes || '',
      ].join('\t')
    );
  });

  return lines.join('\n');
}
