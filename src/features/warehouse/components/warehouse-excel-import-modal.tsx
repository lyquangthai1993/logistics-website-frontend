'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconFileText,
  IconTrash,
  IconBuildingWarehouse,
} from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { WarehouseRowItem, HubOption } from './warehouse-editable-grid';

interface WarehouseExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedRows: WarehouseRowItem[], mode: 'REPLACE' | 'APPEND') => void;
  currentHubName?: string;
  level1Hubs?: HubOption[];
  level2XeBoHubs?: HubOption[];
}

interface ParsedPreviewRow extends WarehouseRowItem {
  isValid: boolean;
  errors: string[];
}

export function WarehouseExcelImportModal({
  isOpen,
  onClose,
  onImport,
  currentHubName = '',
  level1Hubs = [],
  level2XeBoHubs = [],
}: WarehouseExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<'REPLACE' | 'APPEND'>('APPEND');

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ── Download Excel Template File ──
  const handleDownloadTemplate = () => {
    try {
      const headers = [
        'STT',
        'Địa chỉ nhận hàng (*)',
        'Tên hàng (*)',
        'Số kiện (*)',
        'Số kg',
        'Số m³',
        'Địa chỉ giao hàng (*)',
        'Ghi chú',
      ];

      // Provide clean empty rows ready for user/customer to fill in directly
      const emptyRows = [
        [1, '', '', '', '', '', '', ''],
        [2, '', '', '', '', '', '', ''],
        [3, '', '', '', '', '', '', ''],
        [4, '', '', '', '', '', '', ''],
        [5, '', '', '', '', '', '', ''],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...emptyRows]);

      // Set column widths
      ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 28 }, // Địa chỉ nhận
        { wch: 32 }, // Tên hàng
        { wch: 12 }, // Số kiện
        { wch: 12 }, // Số kg
        { wch: 12 }, // Số m3
        { wch: 45 }, // Địa chỉ giao
        { wch: 35 }, // Ghi chú
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Nhap_Kho');

      XLSX.writeFile(wb, 'Mau_Nhap_Kho_Hang_Hoa_TMS.xlsx');
      toast.success('Đã tải xuống file mẫu Excel thành công!');
    } catch (err) {
      console.error('Lỗi khi tạo file mẫu:', err);
      toast.error('Không thể tạo file mẫu Excel');
    }
  };

  // ── Parse Excel File ──
  const parseExcelBuffer = (buffer: ArrayBuffer) => {
    try {
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        toast.error('File Excel không có dữ liệu sheet');
        return;
      }

      const ws = wb.Sheets[firstSheetName];
      const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rawJson.length === 0) {
        toast.error('File Excel không có dòng dữ liệu nào');
        return;
      }

      const validRowsList: ParsedPreviewRow[] = [];

      for (const row of rawJson) {
        // Flexible key matching for both Vietnamese and English headers
        const keys = Object.keys(row);
        const findVal = (patterns: string[]) => {
          const matchKey = keys.find((k) =>
            patterns.some((p) => k.toLowerCase().includes(p.toLowerCase())),
          );
          return matchKey ? row[matchKey] : '';
        };

        const pickupAddress =
          findVal(['địa chỉ nhận', 'nguồn gửi', 'nơi nhận', 'pickup', 'origin']) ||
          currentHubName ||
          '';
        const goodsDescription =
          findVal(['tên hàng', 'hàng hóa', 'loại hàng', 'goods', 'description', 'item']) || '';
        const totalQuantityRaw = findVal(['số kiện', 'số lượng', 'kiện', 'qty', 'quantity']);
        const totalWeightRaw = findVal(['số kg', 'khối lượng', 'trọng lượng', 'weight', 'kg']);
        const totalVolumeRaw = findVal(['số m³', 'số m3', 'thể tích', 'volume', 'm3']);
        const deliveryModeRaw = findVal(['hình thức giao', 'chế độ', 'mode', 'delivery mode']);
        const deliveryAddress =
          findVal(['địa chỉ giao', 'nơi giao', 'đích nhận', 'delivery', 'destination']) || '';
        const notes = findVal(['ghi chú', 'note', 'notes', 'remark']) || '';

        // Skip completely blank rows in Excel
        if (
          !String(goodsDescription).trim() &&
          !String(totalQuantityRaw).trim() &&
          !String(totalWeightRaw).trim() &&
          !String(totalVolumeRaw).trim() &&
          !String(deliveryAddress).trim() &&
          !String(notes).trim()
        ) {
          continue;
        }

        const totalQuantity = parseInt(String(totalQuantityRaw).replace(/\D/g, ''), 10) || 1;
        const totalWeight = parseFloat(String(totalWeightRaw).replace(/,/g, '.')) || 0;
        const totalVolume = parseFloat(String(totalVolumeRaw).replace(/,/g, '.')) || 0;

        // Default deliveryMode is always DIRECT_CUSTOMER. Operator selects/adjusts on UI grid as needed.
        const deliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO' = 'DIRECT_CUSTOMER';

        // Validation checks
        const errors: string[] = [];
        if (!String(goodsDescription).trim()) {
          errors.push('Thiếu tên hàng');
        }
        if (totalQuantity < 1) {
          errors.push('Số kiện phải >= 1');
        }
        if (!String(deliveryAddress).trim()) {
          errors.push('Thiếu địa chỉ giao');
        }

        validRowsList.push({
          orderCode: '(Tự sinh khi lưu)',
          pickupAddress: String(pickupAddress).trim(),
          goodsDescription: String(goodsDescription).trim(),
          totalQuantity,
          totalWeight,
          totalVolume,
          deliveryMode,
          deliveryAddress: String(deliveryAddress).trim(),
          destinationHubId: null,
          notes: String(notes).trim(),
          isValid: errors.length === 0,
          errors,
        });
      }

      if (validRowsList.length === 0) {
        toast.error('File Excel không có dòng dữ liệu hàng hóa nào');
        return;
      }

      setParsedRows(validRowsList);
      toast.success(`Đã đọc thành công ${validRowsList.length} dòng hàng từ file Excel!`);
    } catch (err) {
      console.error('Lỗi khi phân tích file Excel:', err);
      toast.error('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Dropzone Handlers ──
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selected = acceptedFiles[0];
    setFile(selected);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        parseExcelBuffer(buffer);
      }
    };
    reader.readAsArrayBuffer(selected);
  }, [currentHubName, level1Hubs, level2XeBoHubs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  // ── Confirm Import Action ──
  const handleConfirmImport = () => {
    if (parsedRows.length === 0) {
      toast.error('Chưa có dữ liệu nào để nhập');
      return;
    }

    if (validCount === 0) {
      toast.error('Tất cả các dòng dữ liệu đều bị lỗi. Vui lòng kiểm tra lại file Excel.');
      return;
    }

    const cleanRows: WarehouseRowItem[] = parsedRows
      .filter((r) => r.isValid)
      .map(({ isValid, errors, ...item }) => item);

    onImport(cleanRows, importMode);
    toast.success(
      importMode === 'REPLACE'
        ? `Đã thay thế bảng kê bằng ${cleanRows.length} dòng hàng từ Excel!`
        : `Đã thêm ${cleanRows.length} dòng hàng từ Excel vào bảng kê!`,
    );
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:max-w-4xl max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl"
      >
        {/* ── Navy Header (#0F3D62) ── */}
        <div className="bg-[#0F3D62] text-white p-5 border-b border-blue-900/40 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
              <IconFileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Tiếp nhận hàng loạt qua bảng tính</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Nhập Danh Sách Hàng Hóa Từ File Excel</span>
            </h2>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Tải file mẫu, điền danh sách kiện hàng và tải lên để tự động đưa vào bảng kê nhập kho.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold shadow-xs h-9 cursor-pointer"
            >
              <IconDownload className="mr-1.5 h-4 w-4 text-emerald-300" /> Tải file mẫu Excel
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <IconX className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Upload Zone */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <IconUpload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isDragActive
                  ? 'Thả file Excel vào đây...'
                  : 'Kéo thả file Excel vào đây hoặc click để chọn file'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 10MB) &bull; Các cột: Tên hàng (*), Số kiện (*), Số kg, Số m³, Địa chỉ giao hàng (*), Ghi chú
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-lg">
                  <IconFileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB &bull; Đã đọc {parsedRows.length} dòng
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-semibold">
                    Đổi file khác
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                  title="Xóa file"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Xem trước kết quả ({parsedRows.length} dòng):
                  </span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px]">
                    {validCount} hợp lệ
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px]">
                      {invalidCount} lỗi
                    </Badge>
                  )}
                </div>

                {/* Import Mode Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-medium">Chế độ đưa vào:</span>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="h-7 text-xs font-bold text-[#0F3D62] bg-slate-100 dark:bg-slate-800 border rounded-md px-2 focus:outline-none"
                  >
                    <option value="APPEND">Thêm tiếp vào bảng kê (+ {validCount} dòng)</option>
                    <option value="REPLACE">Thay thế toàn bộ bảng kê</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="border rounded-xl overflow-x-auto border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs max-h-64">
                <table className="w-full min-w-[650px] text-xs text-left">
                  <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-[45px] text-center">STT</th>
                      <th className="p-2.5 min-w-[180px]">TÊN HÀNG</th>
                      <th className="p-2.5 text-center w-[85px]">SỐ KIỆN</th>
                      <th className="p-2.5 text-right w-[95px]">SỐ KG</th>
                      <th className="p-2.5 text-right w-[85px]">SỐ M³</th>
                      <th className="p-2.5 min-w-[200px]">ĐỊA CHỈ GIAO</th>
                      <th className="p-2.5 text-center w-[90px]">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {parsedRows.map((r, idx) => (
                      <tr
                        key={idx}
                        className={
                          r.isValid
                            ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                            : 'bg-rose-50/50 dark:bg-rose-950/30'
                        }
                      >
                        <td className="p-2.5 text-center font-mono font-bold text-gray-500">
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                          <div>{r.goodsDescription || <span className="text-red-500 italic">Chưa nhập</span>}</div>
                          {r.notes && <p className="text-[10px] text-gray-400 font-normal">{r.notes}</p>}
                        </td>
                        <td className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                          {r.totalQuantity}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                          {r.totalWeight.toLocaleString('vi-VN')}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
                          {r.totalVolume}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">
                          <span className="truncate block max-w-[220px]" title={r.deliveryAddress}>
                            {r.deliveryAddress || <span className="text-red-500 italic">Chưa nhập</span>}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          {r.isValid ? (
                            <Badge className="bg-emerald-500 text-white font-bold text-[10px] px-1.5 py-0.5">
                              Hợp lệ
                            </Badge>
                          ) : (
                            <Badge
                              className="bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 cursor-help"
                              title={r.errors.join(', ')}
                            >
                              Lỗi
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 italic">
                * Hình thức giao (Giao thẳng / Hub Cấp 1 / Tuyến Xe bo) và Hub nhận đích sẽ được chỉnh sửa và chọn lại trực tiếp trên bảng kê nhập kho.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="text-xs font-semibold h-9"
          >
            Đóng
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={validCount === 0}
              onClick={handleConfirmImport}
              className="bg-[#0F3D62] hover:bg-[#0c314f] text-white text-xs font-bold shadow-md h-9 px-5"
            >
              <IconCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
              Đưa {validCount} dòng vào bảng kê
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
