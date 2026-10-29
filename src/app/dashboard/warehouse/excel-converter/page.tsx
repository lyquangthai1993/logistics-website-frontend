'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  IconFileSpreadsheet,
  IconDownload,
  IconCopy,
  IconArrowRight,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconSearch,
  IconUpload,
  IconAlertCircle,
  IconTruck,
  IconCalendar,
  IconUser,
  IconFilter,
  IconBuildingWarehouse,
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  inspectDispatchWorkbook,
  parseDispatchSheet,
  generateStandardExcelWorkbook,
  generateClipboardTsv,
  StandardizedInboundRow,
  DispatchSheetMeta,
} from '@/features/warehouse/lib/dispatch-excel-converter';

export default function WarehouseExcelConverterPage() {
  const router = useRouter();

  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const [meta, setMeta] = useState<DispatchSheetMeta>({
    date: '',
    driverName: '',
    licensePlate: '',
  });

  const [rows, setRows] = useState<StandardizedInboundRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Xử lý đọc file kéo thả
  const handleFileProcess = useCallback((file: File) => {
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;
        setRawBuffer(buffer);

        const inspection = inspectDispatchWorkbook(buffer);
        setWorkbook(inspection.workbook);
        setSheetNames(inspection.sheetNames);

        const initialSheet = inspection.defaultSheetName || inspection.sheetNames[0] || '';
        setSelectedSheet(initialSheet);

        if (initialSheet) {
          const parsed = parseDispatchSheet(inspection.workbook, initialSheet);
          setRows(parsed.rows);
          setMeta(parsed.meta);
          toast.success(
            `Đã chuyển đổi thành công ${parsed.rows.length} dòng hàng từ sheet "${initialSheet}"`
          );
        }
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err);
        toast.error('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng tệp!');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileProcess(acceptedFiles[0]);
      }
    },
    [handleFileProcess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  // Chuyển đổi lại khi người dùng chọn Sheet khác
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (!workbook) return;

    try {
      const parsed = parseDispatchSheet(workbook, sheetName);
      setRows(parsed.rows);
      setMeta(parsed.meta);
      toast.info(`Đã tải dữ liệu từ sheet "${sheetName}" (${parsed.rows.length} dòng hàng)`);
    } catch (err) {
      console.error('Lỗi khi đổi sheet:', err);
      toast.error('Lỗi khi đọc dữ liệu sheet');
    }
  };

  // Cập nhật cell trên lưới xem trước
  const handleCellChange = (
    index: number,
    field: keyof StandardizedInboundRow,
    value: any
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // Xóa dòng đơn khỏi danh sách
  const handleDeleteRow = (index: number) => {
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((r, i) => ({ ...r, stt: i + 1 }));
    });
    toast.info('Đã xóa 1 dòng đơn');
  };

  // Sao chép dạng TSV vào Clipboard (tương thích 100% với phím Ctrl+V trên bảng Nhập kho)
  const handleCopyClipboard = () => {
    if (rows.length === 0) {
      toast.warning('Chưa có dữ liệu để sao chép');
      return;
    }

    try {
      const tsv = generateClipboardTsv(rows, true);
      navigator.clipboard.writeText(tsv).then(() => {
        setIsCopied(true);
        toast.success(`Đã sao chép ${rows.length} dòng hàng vào Clipboard! Bạn có thể dán (Ctrl+V) vào bảng Nhập kho.`);
        setTimeout(() => setIsCopied(false), 2500);
      });
    } catch (err) {
      console.error('Lỗi sao chép:', err);
      toast.error('Không thể sao chép vào Clipboard');
    }
  };

  // Tải file Excel chuẩn (.xlsx)
  const handleDownloadStandardExcel = () => {
    if (rows.length === 0) {
      toast.warning('Chưa có dữ liệu để xuất file');
      return;
    }

    try {
      setIsExporting(true);
      const standardWb = generateStandardExcelWorkbook(rows, meta);
      const safeSheet = selectedSheet.replace(/[/\\?*:[\]]/g, '_');
      const outFileName = `Phieu_Yeu_Cau_Nhap_Kho_Chuan_${safeSheet}_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(standardWb, outFileName);
      toast.success(`Đã tải xuống file Excel chuẩn: ${outFileName}`);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      toast.error('Không thể xuất file Excel chuẩn');
    } finally {
      setIsExporting(false);
    }
  };

  // Chuyển thẳng dữ liệu sang trang Nhập kho (/dashboard/warehouse/inbound)
  const handleTransferToInbound = () => {
    if (rows.length === 0) {
      toast.warning('Chưa có dữ liệu để chuyển sang Nhập kho');
      return;
    }

    try {
      // Đóng gói dữ liệu tương thích WarehouseRowItem và lưu sessionStorage để trang Inbound load ngay
      const transferPayload = {
        licensePlate: meta.licensePlate || '',
        driverName: meta.driverName || '',
        receiveDate: meta.date || new Date().toISOString().split('T')[0],
        rows: rows.map((r) => ({
          orderCode: r.orderCode,
          pickupAddress: r.pickupAddress,
          goodsDescription: r.goodsDescription,
          totalQuantity: r.totalQuantity,
          totalWeight: r.totalWeight,
          totalVolume: r.totalVolume,
          deliveryAddress: r.deliveryAddress,
          province: r.province,
          accompanyingDocs: r.accompanyingDocs,
          notes: r.notes,
          deliveryMode: 'DIRECT_CUSTOMER',
        })),
      };

      sessionStorage.setItem('TMS_INBOUND_CONVERTER_TRANSFER', JSON.stringify(transferPayload));
      toast.success('Đang chuyển hướng sang trang Nhập kho...');
      router.push('/dashboard/warehouse/inbound?from=converter');
    } catch (err) {
      console.error('Lỗi lưu cache chuyển đổi:', err);
      toast.error('Không thể điều hướng dữ liệu sang Nhập kho');
    }
  };

  // Reset về trạng thái ban đầu
  const handleReset = () => {
    setRawBuffer(null);
    setFileName('');
    setFileSize(0);
    setSheetNames([]);
    setSelectedSheet('');
    setWorkbook(null);
    setRows([]);
    setSearchQuery('');
  };

  // Tính tổng số liệu theo thời gian thực
  const totalPackages = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0),
    [rows]
  );
  const totalWeight = useMemo(
    () => Math.round(rows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0) * 100) / 100,
    [rows]
  );
  const totalVolume = useMemo(
    () => Math.round(rows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0) * 1000) / 1000,
    [rows]
  );

  // Lọc dữ liệu theo từ khóa tìm kiếm
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.orderCode.toLowerCase().includes(q) ||
        r.goodsDescription.toLowerCase().includes(q) ||
        r.deliveryAddress.toLowerCase().includes(q) ||
        r.province.toLowerCase().includes(q) ||
        r.pickupAddress.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  return (
    <div className='p-2 space-y-2 max-w-7xl mx-auto'>
      {/* ── Tiêu đề & Breadcrumb ── */}
      <div className='flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b'>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Link
              href='/dashboard/warehouse/inbound'
              className='hover:text-blue-600 flex items-center gap-1'
            >
              <IconBuildingWarehouse className='h-3.5 w-3.5' />
              Quản lý Nhập kho
            </Link>
            <span>/</span>
            <span className='text-foreground font-medium'>Công cụ chuyển đổi Excel Điều hành</span>
          </div>
          <h1 className='text-lg font-black tracking-tight text-[#0F3D62] dark:text-blue-300 flex items-center gap-1.5'>
            <IconFileSpreadsheet className='h-5 w-5 text-emerald-600 shrink-0' />
            Chuẩn Hóa File Excel Nhập Kho (Điều Hành Sang Mẫu Chuẩn)
          </h1>
        </div>

        <div className='flex items-center gap-1.5'>
          <Link href='/dashboard/warehouse/inbound'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-xs font-semibold border-slate-300'
            >
              Quay lại Nhập kho
            </Button>
          </Link>
          {rows.length > 0 && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleReset}
              className='h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50'
            >
              <IconRefresh className='h-3.5 w-3.5 mr-1' />
              Chọn file khác
            </Button>
          )}
        </div>
      </div>

      {/* ── Khu vực Upload Kéo Thả (Nếu chưa chọn file) ── */}
      {rows.length === 0 ? (
        <Card className='p-1 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'>
          <CardContent className='p-2'>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center p-2.5 text-center cursor-pointer rounded-lg transition-colors ${
                isDragActive
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <input {...getInputProps()} />
              <div className='w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-1.5'>
                <IconUpload className='h-5 w-5' />
              </div>
              <h3 className='text-sm font-bold text-slate-800 dark:text-slate-200 mb-1'>
                Kéo thả file Excel từ Điều hành vào đây, hoặc bấm để chọn tệp
              </h3>
              <p className='text-xs text-muted-foreground max-w-md mb-3'>
                Hỗ trợ file tổng hợp ngày của Điều hành (.xlsx, .xls). Hệ thống tự động nhận diện tất cả các sheet ngày, bóc tách 63 Tỉnh/TP và chuẩn hóa 11 cột chuẩn cho TMS.
              </p>
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='text-[10px] bg-white dark:bg-slate-800 text-slate-600'>
                  Mẫu: NDA_PhieuYeuCauNhapKho_2026.xlsx
                </Badge>
                <Badge variant='outline' className='text-[10px] bg-white dark:bg-slate-800 text-emerald-600 font-semibold'>
                  Tự động điền 1 kiện cho hàng lốp xe
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── Khi đã có dữ liệu: Hiển thị thanh cấu hình & Bảng xem trước ── */
        <div className='space-y-2'>
          {/* Card Thông tin Chuyến xe & Bộ lọc Sheet */}
          <Card className='p-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'>
            <CardContent className='p-2 space-y-2'>
              <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
                {/* Chọn Sheet */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1'>
                    <IconFileSpreadsheet className='h-4 w-4 text-emerald-600' />
                    Sheet đang chọn:
                  </span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className='h-8 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border rounded-md px-2 min-w-30 focus:outline-none focus:ring-1 focus:ring-blue-600'
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className='text-[11px] text-muted-foreground'>
                    ({fileName} &bull; {(fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>

                {/* Pill tổng số liệu */}
                <div className='flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50/90 dark:bg-blue-950/60 text-xs font-bold border border-blue-200 dark:border-blue-800'>
                  <span className='text-blue-950 dark:text-blue-200 font-bold'>Tổng:</span>
                  <span className='text-blue-700 dark:text-blue-300 font-black'>
                    {totalPackages.toLocaleString('vi-VN')} kiện
                  </span>
                  <span className='text-blue-300 dark:text-blue-700'>&bull;</span>
                  <span className='text-emerald-700 dark:text-emerald-400 font-black'>
                    {totalWeight.toLocaleString('vi-VN')} kg
                  </span>
                  <span className='text-blue-300 dark:text-blue-700'>&bull;</span>
                  <span className='text-purple-700 dark:text-purple-300 font-black'>
                    {totalVolume.toFixed(2).replace('.', ',')} m³
                  </span>
                  <span className='text-blue-300 dark:text-blue-700'>&bull;</span>
                  <span className='text-slate-700 dark:text-slate-300 font-bold'>
                    {rows.length} đơn
                  </span>
                </div>
              </div>

              {/* Các trường thông tin chuyến xe */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5'>
                <div>
                  <label className='text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1'>
                    <IconCalendar className='h-3.5 w-3.5 text-blue-600' />
                    Ngày nhận hàng:
                  </label>
                  <Input
                    type='text'
                    value={meta.date}
                    onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                    placeholder='DD/MM/YYYY'
                    className='h-8 text-xs font-semibold'
                  />
                </div>
                <div>
                  <label className='text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1'>
                    <IconTruck className='h-3.5 w-3.5 text-blue-600' />
                    Biển số xe nhận:
                  </label>
                  <Input
                    type='text'
                    value={meta.licensePlate}
                    onChange={(e) => setMeta({ ...meta, licensePlate: e.target.value })}
                    placeholder='VD: 51D-482.91'
                    className='h-8 text-xs font-semibold'
                  />
                </div>
                <div>
                  <label className='text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1'>
                    <IconUser className='h-3.5 w-3.5 text-blue-600' />
                    Tên lái xe:
                  </label>
                  <Input
                    type='text'
                    value={meta.driverName}
                    onChange={(e) => setMeta({ ...meta, driverName: e.target.value })}
                    placeholder='VD: Nguyễn Văn Hùng'
                    className='h-8 text-xs font-semibold'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ô tìm kiếm nhanh dòng đơn */}
          <div className='flex items-center justify-between gap-2'>
            <div className='relative w-72'>
              <IconSearch className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Lọc theo mã đơn, hàng, địa chỉ, tỉnh...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-8 pl-8 text-xs'
              />
            </div>
            <span className='text-[11px] text-muted-foreground'>
              Hiển thị {filteredRows.length} / {rows.length} dòng hàng chuẩn
            </span>
          </div>

          {/* Bảng Dữ liệu Chuẩn 11 Cột */}
          <div className='border rounded-lg overflow-x-auto bg-white dark:bg-slate-900 shadow-xs'>
            <table className='w-full text-[10px] text-left border-collapse min-w-[1000px]'>
              <thead className='bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b select-none sticky top-0 z-10'>
                <tr>
                  <th className='py-1 px-1.5 w-8 text-center'>STT</th>
                  <th className='py-1 px-1.5 w-28'>Mã vận đơn (*)</th>
                  <th className='py-1 px-1.5 w-36'>Địa chỉ nhận (*)</th>
                  <th className='py-1 px-1.5 w-32'>Tên hàng (*)</th>
                  <th className='py-1 px-1.5 w-16 text-right'>Số kiện (*)</th>
                  <th className='py-1 px-1.5 w-16 text-right'>Số KG (*)</th>
                  <th className='py-1 px-1.5 w-16 text-right'>Số m³ (*)</th>
                  <th className='py-1 px-1.5 min-w-50'>Địa chỉ giao (*)</th>
                  <th className='py-1 px-1.5 w-24'>Tỉnh / TP</th>
                  <th className='py-1 px-1.5 w-24'>Chứng từ</th>
                  <th className='py-1 px-1.5 w-28'>Ghi chú</th>
                  <th className='py-1 px-1.5 w-8 text-center'>Xóa</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200 dark:divide-slate-800'>
                {filteredRows.map((r, idx) => (
                  <tr
                    key={r.stt}
                    className='hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
                  >
                    <td className='py-1 px-1.5 text-center font-mono text-muted-foreground'>
                      {r.stt}
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.orderCode}
                        onChange={(e) => handleCellChange(r.stt - 1, 'orderCode', e.target.value)}
                        className='w-full h-6 px-1 font-mono font-bold text-[11px] text-blue-700 dark:text-blue-300 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.pickupAddress}
                        onChange={(e) =>
                          handleCellChange(r.stt - 1, 'pickupAddress', e.target.value)
                        }
                        className='w-full h-6 px-1 text-[10px] bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800 truncate'
                      />
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.goodsDescription}
                        onChange={(e) =>
                          handleCellChange(r.stt - 1, 'goodsDescription', e.target.value)
                        }
                        className='w-full h-6 px-1 text-[10px] font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5 text-right'>
                      <input
                        type='number'
                        min={1}
                        value={r.totalQuantity}
                        onChange={(e) =>
                          handleCellChange(
                            r.stt - 1,
                            'totalQuantity',
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className='w-full h-6 px-1 text-[10px] text-right font-bold text-blue-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5 text-right'>
                      <input
                        type='number'
                        step='0.01'
                        value={r.totalWeight}
                        onChange={(e) =>
                          handleCellChange(
                            r.stt - 1,
                            'totalWeight',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className='w-full h-6 px-1 text-[10px] text-right font-semibold text-emerald-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5 text-right'>
                      <input
                        type='number'
                        step='0.001'
                        value={r.totalVolume}
                        onChange={(e) =>
                          handleCellChange(
                            r.stt - 1,
                            'totalVolume',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className='w-full h-6 px-1 text-[10px] text-right font-semibold text-purple-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.deliveryAddress}
                        onChange={(e) =>
                          handleCellChange(r.stt - 1, 'deliveryAddress', e.target.value)
                        }
                        className='w-full h-6 px-1 text-[10px] bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5'>
                      <span className='inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 text-[10px] whitespace-nowrap'>
                        {r.province || 'Chưa nhận diện'}
                      </span>
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.accompanyingDocs}
                        onChange={(e) =>
                          handleCellChange(r.stt - 1, 'accompanyingDocs', e.target.value)
                        }
                        placeholder='Không ct'
                        className='w-full h-6 px-1 text-[10px] text-muted-foreground bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800'
                      />
                    </td>
                    <td className='py-1 px-1.5'>
                      <input
                        type='text'
                        value={r.notes}
                        onChange={(e) => handleCellChange(r.stt - 1, 'notes', e.target.value)}
                        className='w-full h-6 px-1 text-[10px] text-muted-foreground bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white dark:focus:bg-slate-800 truncate'
                      />
                    </td>
                    <td className='py-1 px-1.5 text-center'>
                      <button
                        type='button'
                        onClick={() => handleDeleteRow(r.stt - 1)}
                        className='text-slate-400 hover:text-rose-600 transition-colors p-0.5'
                        title='Xóa dòng này'
                      >
                        <IconTrash className='h-3.5 w-3.5' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Thanh Tác Vụ Cố Định (Sticky Bottom Action Bar) ── */}
          <div className='sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t p-2 rounded-b-lg shadow-md flex flex-wrap items-center justify-between gap-2 z-20'>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCopyClipboard}
                className='h-8 text-xs font-bold border-slate-300 shadow-xs'
              >
                {isCopied ? (
                  <>
                    <IconCheck className='h-4 w-4 mr-1 text-emerald-600' />
                    Đã copy Clipboard!
                  </>
                ) : (
                  <>
                    <IconCopy className='h-4 w-4 mr-1 text-blue-600' />
                    Sao chép Clipboard (Dán vào TMS)
                  </>
                )}
              </Button>

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleDownloadStandardExcel}
                disabled={isExporting}
                className='h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs'
              >
                <IconDownload className='h-4 w-4 mr-1 text-emerald-600' />
                Tải file Excel chuẩn (.xlsx)
              </Button>
            </div>

            <Button
              type='button'
              size='sm'
              onClick={handleTransferToInbound}
              className='h-8 bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm'
            >
              Chuyển thẳng sang Nhập kho
              <IconArrowRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
