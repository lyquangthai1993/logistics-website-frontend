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
        (rowStr.includes('điều hành') || rowStr.includes('địa chỉ lấy hàng') || rowStr.includes('kho nhập'))
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

  // Tìm dòng header của bảng điều hành (14 cột)
  let headerRowIdx = -1;
  let headerCols: string[] = [];

  for (let r = 0; r < Math.min(data.length, 25); r++) {
    const row = (data[r] || []).map((c) => String(c || '').trim());
    const lowerRow = row.map((c) => c.toLowerCase());
    if (
      lowerRow.some((c) => c.includes('mã đơn hàng') || c.includes('mã đơn')) &&
      lowerRow.some((c) => c.includes('địa chỉ lấy hàng') || c.includes('tên hàng') || c.includes('kho nhập'))
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

  // Map vị trí các cột dựa vào tiêu đề header
  const findColIdx = (patterns: string[]) => {
    return headerCols.findIndex((col) =>
      patterns.some((p) => col.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const colDate = findColIdx(['ngày tháng', 'ngày']);
  const colOrderCode = findColIdx(['mã đơn hàng', 'mã đơn', 'mã vận đơn']);
  const colDispatcher = findColIdx(['điều hành']);
  const colPlate = findColIdx(['số xe']);
  const colDriver = findColIdx(['tên tài xế', 'tài xế', 'lái xe']);
  const colGoodsName = findColIdx(['tên hàng', 'hàng hóa']);
  const colDestWarehouse = findColIdx(['kho nhập']);
  const colExpectedTime = findColIdx(['giờ dự kiến']);
  const colPickupAddr = findColIdx(['địa chỉ lấy hàng', 'địa chỉ lấy', 'nơi nhận']);
  const colDeliveryAddr = findColIdx(['địa chỉ giao hàng', 'địa chỉ giao', 'nơi giao']);
  const colQty = findColIdx(['số lượng', 'số kiện', 'kiện']);
  const colWeight = findColIdx(['khối lượng', 'trọng lượng', 'số kg', 'kg']);
  const colVolume = findColIdx(['thể tích', 'số m³', 'số m3', 'm³', 'm3']);
  const colNotes = findColIdx(['ghi chú', 'lưu ý']);

  let detectedDate = '';
  let detectedPlate = '';
  let detectedDriver = '';

  // Thử tìm ngày ở dòng 10 hoặc tiêu đề
  for (let r = 0; r < headerRowIdx; r++) {
    const row = data[r] || [];
    for (const cell of row) {
      if (typeof cell === 'number' && cell > 40000 && cell < 60000 && !detectedDate) {
        detectedDate = formatExcelDate(cell);
      }
    }
  }

  const rawRows = data.slice(headerRowIdx + 1);
  const rows: StandardizedInboundRow[] = [];

  for (const row of rawRows) {
    if (!row || row.length === 0) continue;

    const rawOrderCode = colOrderCode !== -1 ? String(row[colOrderCode] || '').trim() : '';
    // Bỏ qua các dòng trống hoàn toàn hoặc không có mã đơn
    if (!rawOrderCode) continue;

    // Lọc mã đơn sạch (loại bỏ xuống dòng)
    const orderCode = rawOrderCode.replace(/[\r\n\t]+/g, ' ').trim();

    const rawPickupAddr = colPickupAddr !== -1 ? String(row[colPickupAddr] || '').trim() : '';
    const pickupAddress = rawPickupAddr.replace(/[\r\n\t]+/g, ' ').trim();

    const rawGoods = colGoodsName !== -1 ? String(row[colGoodsName] || '').trim() : '';
    const goodsDescription = rawGoods.replace(/[\r\n\t]+/g, ' ').trim();

    // Số lượng: nếu rỗng, undefined, hoặc <= 0 thì tự động gán là 1 kiện
    const rawQty = colQty !== -1 ? String(row[colQty] || '').trim() : '';
    const parsedQty = parseInt(rawQty.replace(/[^\d]/g, ''), 10);
    const totalQuantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

    // Số kg
    const rawWeight = colWeight !== -1 ? String(row[colWeight] || '').trim() : '';
    const totalWeight =
      parseFloat(rawWeight.replace(/\s+/g, '').replace(/,/g, '.')) || 0;

    // Số m³
    const rawVolume = colVolume !== -1 ? String(row[colVolume] || '').trim() : '';
    const totalVolume =
      parseFloat(rawVolume.replace(/\s+/g, '').replace(/,/g, '.')) || 0;

    // Địa chỉ giao
    const rawDeliveryAddr = colDeliveryAddr !== -1 ? String(row[colDeliveryAddr] || '').trim() : '';
    const deliveryAddress = rawDeliveryAddr.replace(/[\r\n\t]+/g, ' ').trim();

    // Bóc tách Tỉnh / Thành phố
    const province = extractVietnamProvince(deliveryAddress);

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
    const rawNote = colNotes !== -1 ? String(row[colNotes] || '').trim() : '';

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
        r.totalQuantity,
        r.totalWeight,
        r.totalVolume,
        r.deliveryAddress,
        r.province,
        r.accompanyingDocs || '',
        r.notes || '',
      ].join('\t')
    );
  });

  return lines.join('\n');
}
