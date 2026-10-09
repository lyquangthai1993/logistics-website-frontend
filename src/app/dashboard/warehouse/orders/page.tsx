'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconSearch,
  IconBuildingWarehouse,
  IconPrinter,
  IconLoader2,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronsRight,
  IconRefresh,
  IconTrash,
  IconEye,
  IconTruck,
  IconFileSpreadsheet
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import {
  PalletLabelA4Modal,
  PalletLabelData
} from '@/features/warehouse/components/pallet-label-a4-modal';
import {
  WarehouseWaybillDetailModal,
  WaybillDetailData
} from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';

export default function WarehouseOrdersPage() {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    totalPages: number;
    allCount?: number;
    storedCount?: number;
    draftCount?: number;
    dispatchedCount?: number;
  }>({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [printData, setPrintData] = useState<PalletLabelData | null>(null);

  // Waybill Detail Modal State
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillDetailData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Delete draft handler
  const handleDeleteDraft = async (id: number, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng nháp "${code}" không?`)) return;
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/orders/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: err, status: res.status } };
      }
      toast.success(`Đã xóa đơn hàng nháp ${code} thành công`);
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể xóa đơn hàng');
    }
  };

  /** Chuyển đổi tên có dấu thành không dấu và định dạng slug cho tên file */
  const normalizeNoDiacritics = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  /** Xử lý xuất danh sách đơn hàng theo trạng thái Tab đang chọn ra file Excel */
  const handleExportStoredOrdersExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    const getTabReportConfig = () => {
      switch (statusFilter) {
        case 'INBOUND':
          return {
            titleSuffix: 'LƯU KHO',
            fileSlug: 'luu_kho',
            sheetName: 'Đơn Hàng Lưu Kho',
            toastDesc: 'lưu kho'
          };
        case 'COMPLETED_INBOUND':
          return {
            titleSuffix: 'ĐÃ XUẤT KHO',
            fileSlug: 'da_xuat_kho',
            sheetName: 'Đơn Hàng Đã Xuất',
            toastDesc: 'đã xuất kho'
          };
        case 'DRAFT':
          return {
            titleSuffix: 'ĐƠN NHÁP',
            fileSlug: 'don_nhap',
            sheetName: 'Đơn Hàng Nháp',
            toastDesc: 'đơn nháp'
          };
        default:
          return {
            titleSuffix: 'TỔNG HỢP TẤT CẢ',
            fileSlug: 'tat_ca',
            sheetName: 'Tất Cả Đơn Hàng',
            toastDesc: 'tổng hợp'
          };
      }
    };

    const tabConfig = getTabReportConfig();
    const toastId = toast.loading(`Đang khởi tạo dữ liệu báo cáo ${tabConfig.toastDesc}...`);

    try {
      const token = tokenManager.getAccessToken();
      const query = new URLSearchParams({
        groupBy: 'orderCode',
        isExport: 'true',
        limit: '5000',
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {})
      });

      const res = await fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw { response: { data: errJson, status: res.status } };
      }

      const resData = await res.json();
      const orders: any[] = resData?.data ?? [];

      if (!orders || orders.length === 0) {
        toast.dismiss(toastId);
        toast.warning(`Kho hiện tại không có đơn hàng nào ở trạng thái ${tabConfig.toastDesc}.`);
        return;
      }

      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const nowFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

      const hubTitle = currentHubName || user?.hub?.name || 'Tất cả các Hub';
      const reporterName = user?.name || user?.email || 'Thủ kho';

      let totalStock = 0;
      let totalOriginalQty = 0;
      let totalWeight = 0;
      let totalVolume = 0;

      let stt = 1;
      const rows: any[][] = [];

      for (const order of orders) {
        const itemsToExport =
          Array.isArray(order.items) && order.items.length > 0 ? order.items : [order];

        for (const item of itemsToExport) {
          const rawStock = Number(item.hubStock ?? item.remainingQuantity ?? 0);
          const rawTotal = Number(item.totalQuantity ?? 0);
          const total = Math.max(rawTotal, rawStock, 0);
          const stock = Math.max(0, Math.min(rawStock, total));

          if (stock <= 0 && itemsToExport.length > 1 && statusFilter === 'INBOUND') {
            continue;
          }

          const itemWeight = Number(item.totalWeight ?? 0);
          const itemVolume = Number(item.totalVolume ?? 0);

          totalStock += stock;
          totalOriginalQty += total;
          totalWeight += itemWeight;
          totalVolume += itemVolume;

          const trips =
            Array.isArray(order.trips) && order.trips.length > 0
              ? order.trips
              : Array.isArray(item.trips)
                ? item.trips
                : [];
          const tripCodes = trips
            .map((t: any) => t.tripCode)
            .filter(Boolean)
            .join(', ');
          const licensePlates = Array.from(
            new Set(
              [
                ...trips.map((t: any) => t.licensePlate),
                order.vehicleLicensePlate,
                item.vehicleLicensePlate
              ].filter(Boolean)
            )
          ).join(', ');

          let tripDisplay = '—';
          if (tripCodes && licensePlates) {
            tripDisplay = `${tripCodes} (${licensePlates})`;
          } else if (tripCodes) {
            tripDisplay = tripCodes;
          } else if (licensePlates) {
            tripDisplay = licensePlates;
          }

          const inboundDateStr =
            item.inboundDate || order.inboundDate || item.createdAt || order.createdAt;
          const originHubStr =
            item.originHubEntity?.name ||
            order.originHubEntity?.name ||
            item.originHub ||
            order.originHub ||
            '—';
          const destHubStr =
            item.destinationHubEntity?.name ||
            order.destinationHubEntity?.name ||
            item.destinationHub ||
            order.destinationHub ||
            item.deliveryAddress ||
            order.deliveryAddress ||
            '—';
          const provinceStr =
            item.destinationHubEntity?.city ||
            order.destinationHubEntity?.city ||
            item.province ||
            order.province ||
            '—';
          const notesStr =
            item.operationalNotes ||
            order.operationalNotes ||
            item.accompanyingDocs ||
            order.accompanyingDocs ||
            item.notes ||
            order.notes ||
            '—';

          const resolvedStatus = resolveDisplayStatus(item) || resolveDisplayStatus(order);
          let statusText = 'LƯU KHO';
          if (resolvedStatus === 'COMPLETED_INBOUND') {
            statusText = 'ĐÃ XUẤT KHO';
          } else if (resolvedStatus === 'DRAFT') {
            statusText = 'ĐƠN NHÁP';
          } else if (resolvedStatus === 'PENDING_INBOUND' || resolvedStatus === 'WAITING') {
            statusText = 'CHỜ NHẬP KHO';
          } else if (resolvedStatus === 'IN_TRANSIT') {
            statusText = 'ĐANG VẬN CHUYỂN';
          }

          rows.push([
            stt++,
            order.orderCode,
            formatDateTime(inboundDateStr),
            originHubStr,
            item.goodsDescription || order.goodsDescription || 'Hàng hóa tổng hợp',
            stock,
            total,
            itemWeight,
            itemVolume,
            destHubStr,
            provinceStr,
            tripDisplay,
            statusText,
            notesStr
          ]);
        }
      }

      const totalOrdersCount = orders.length;

      const wsData: any[][] = [
        [`SPIDER EXPRESS LOGISTICS TMS - BÁO CÁO ĐƠN HÀNG ${tabConfig.titleSuffix}`],
        [`Kho / Trạm Hub: ${hubTitle}`],
        [`Thời điểm xuất: ${nowFormatted} | Người lập báo cáo: ${reporterName}`],
        [
          `Thống kê tổng quan: Tổng số đơn: ${totalOrdersCount} đơn | Tổng số kiện tồn: ${totalStock} kiện | Tổng khối lượng: ${totalWeight.toFixed(1)} kg | Tổng thể tích: ${totalVolume.toFixed(3)} m³`
        ],
        [], // Dòng 5 trống ngăn cách Header và Bảng kê
        [
          'STT',
          'MÃ VẬN ĐƠN',
          'NGÀY NHẬP KHO',
          'NƠI GỬI / HUB GỬI',
          'TÊN HÀNG HÓA',
          'SỐ KIỆN TỒN KHO',
          'TỔNG KIỆN ĐƠN',
          'KHỐI LƯỢNG (KG)',
          'THỂ TÍCH (M³)',
          'ĐÍCH ĐẾN / ĐỊA CHỈ GIAO',
          'TỈNH / THÀNH PHỐ',
          'CHUYẾN XE / BIỂN SỐ ĐẾN',
          'TRẠNG THÁI',
          'GHI CHÚ / CHỨNG TỪ'
        ],
        ...rows,
        [
          '',
          '',
          '',
          '',
          'TỔNG CỘNG',
          totalStock,
          totalOriginalQty,
          Math.round(totalWeight * 10) / 10,
          Math.round(totalVolume * 1000) / 1000,
          '',
          '',
          '',
          '',
          ''
        ]
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 18 },
        { wch: 26 },
        { wch: 30 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 35 },
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 30 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tabConfig.sheetName);

      const hubFileSlug = normalizeNoDiacritics(hubTitle);
      const fileName = `Bao_cao_don_hang_${tabConfig.fileSlug}_${hubFileSlug}_${dateStr}.xlsx`;

      // Xuất file tương thích đa nền tảng và kích hoạt sự kiện browser download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      toast.dismiss(toastId);
      toast.success(
        `Đã xuất thành công báo cáo ${tabConfig.toastDesc} (${totalOrdersCount} đơn hàng)!`
      );
    } catch (err: any) {
      toast.dismiss(toastId);
      showApiErrorToast(err, `Lỗi xuất báo cáo Excel ${tabConfig.toastDesc}`);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      // One row per order code; lines sharing a code are returned in `items`
      groupBy: 'orderCode',
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {})
    });

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        setData(resData?.data ?? []);
        setMeta({
          total: resData?.meta?.total ?? 0,
          totalPages: resData?.meta?.totalPages || 1,
          allCount: resData?.meta?.allCount,
          storedCount: resData?.meta?.storedCount,
          draftCount: resData?.meta?.draftCount,
          dispatchedCount: resData?.meta?.dispatchedCount
        });
      })
      .catch(() => {
        setData([]);
        toast.error('Không tải được danh sách đơn hàng kho. Vui lòng thử lại.');
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Order codes whose member lines are expanded
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const toggleExpanded = (code: string) =>
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const COLUMN_COUNT = 11;

  /** Date/time formatting helper */
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return '—';
    }
  };

  /** Outbound date render guard: strictly empty (—) if stored, draft, or has stock */
  const renderOutboundDate = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    const status = (resolveDisplayStatus(r) || '').toUpperCase();
    const storedStatuses = [
      'INBOUND',
      'STORED',
      'LUU_KHO',
      'IN_WAREHOUSE',
      'DRAFT',
      'PENDING',
      'PENDING_INBOUND',
      'WAITING'
    ];

    if (stock > 0 || storedStatuses.includes(status) || !r.outboundDate) {
      return <span className='text-slate-400 font-semibold text-[10px]'>—</span>;
    }

    return (
      <span className='font-mono text-slate-700 dark:text-slate-300 text-[10px]'>
        {formatDateTime(r.outboundDate)}
      </span>
    );
  };

  /** Stock held at the viewer's hub (ledger) — falls back to remainingQuantity without hub scope. */
  const renderStock = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    return (
      <>
        <span className='font-bold text-emerald-600 dark:text-emerald-400'>{stock}</span>
        <span className='text-slate-400'> / {total}</span>
      </>
    );
  };

  /** Status display guard: Never display "LƯU KHO" when stock at this hub is 0. */
  const resolveDisplayStatus = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    const rawStatus = (r.hubStatus ?? r.status ?? '').toUpperCase();
    if (
      stock === 0 &&
      (rawStatus === 'INBOUND' ||
        rawStatus === 'STORED' ||
        rawStatus === 'LUU_KHO' ||
        rawStatus === 'IN_WAREHOUSE')
    ) {
      return 'COMPLETED_INBOUND';
    }
    return r.hubStatus ?? r.status;
  };

  const renderTripCell = (r: any) => {
    const allTrips: any[] = Array.isArray(r.trips) && r.trips.length > 0 ? r.trips : [];
    const activeTrip = allTrips[0];
    const tripCode = activeTrip?.tripCode || (activeTrip?.id ? `TRIP-${activeTrip.id}` : null);
    const plate = activeTrip?.licensePlate || r.vehicleLicensePlate;
    const driver = activeTrip?.driverName || r.driverName;

    if (!tripCode && !plate && allTrips.length === 0) {
      return <span className='text-gray-400 italic text-[10px]'>—</span>;
    }

    const multiTruckCount = allTrips.length;
    const hasMultiTrucks = multiTruckCount > 1;
    const multiTruckTooltip = allTrips
      .map(
        (t: any, i: number) =>
          `Xe ${i + 1}: ${t.licensePlate || 'Chưa có BKS'} (${t.tripCode || 'Chưa có mã trip'})${
            t.driverName ? ` - ${t.driverName}` : ''
          }`
      )
      .join('\n');

    return (
      <div
        className='text-[10px] space-y-0.5'
        title={hasMultiTrucks ? multiTruckTooltip : undefined}
      >
        {tripCode && (
          <div className='font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center gap-1'>
            <span>{tripCode}</span>
            {hasMultiTrucks && (
              <Badge
                variant='outline'
                className='text-[9px] font-bold px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
                title={`Đơn hàng gồm ${multiTruckCount} chuyến xe tiếp nhận`}
              >
                +{multiTruckCount - 1} trip
              </Badge>
            )}
          </div>
        )}
        {plate && (
          <div className='font-mono font-semibold text-slate-800 dark:text-slate-200 text-[10px] flex items-center gap-1 flex-wrap'>
            <IconTruck className='h-3 w-3 text-slate-400 shrink-0' />
            <span>{plate}</span>
            {hasMultiTrucks && (
              <Badge
                className='text-[9px] font-bold px-1 py-0 h-3.5 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-0'
                title={`Vận chuyển bởi ${multiTruckCount} phương tiện:\n${multiTruckTooltip}`}
              >
                +{multiTruckCount - 1} xe
              </Badge>
            )}
          </div>
        )}
        {driver && (
          <div className='text-[9px] text-gray-400 truncate max-w-[120px]' title={driver}>
            {driver}
          </div>
        )}
      </div>
    );
  };

  /** Actions for one physical cargo line (detail, label, delete draft). */
  const renderActions = (m: any, openDetail: (target: any) => void) => (
    <div className='flex items-center justify-center gap-1'>
      <Button
        size='sm'
        variant='ghost'
        onClick={() => openDetail(m)}
        className='h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50'
        title='Xem chi tiết vận đơn'
      >
        <IconEye className='h-4 w-4' />
      </Button>
      <Button
        size='sm'
        variant='ghost'
        onClick={() =>
          setPrintData({
            orderCode: m.orderCode,
            goodsDescription: m.goodsDescription || '',
            totalQuantity: m.totalQuantity ?? 0,
            packagesOnPallet: m.totalQuantity ?? 0,
            palletIndex: 1,
            totalPallets: 1,
            destinationHub: m.destinationHub || m.route,
            province: m.province || m.destinationHubEntity?.city || m.destinationHub,
            destinationHubEntity: m.destinationHubEntity,
            warehouseName: m.currentHubEntity?.name,
            createdAt: m.createdAt
          })
        }
        className='h-7 w-7 p-0 text-blue-600 hover:bg-blue-50'
        title='In tem nhận diện A4'
      >
        <IconPrinter className='h-4 w-4' />
      </Button>
      {m.status === 'DRAFT' && (
        <Button
          size='sm'
          variant='ghost'
          onClick={() => handleDeleteDraft(m.id, m.orderCode)}
          className='h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          title='Xóa đơn nháp'
        >
          <IconTrash className='h-4 w-4' />
        </Button>
      )}
    </div>
  );

  return (
    <PageContainer>
      <div className='space-y-2 flex-1 w-full min-w-0'>
        {/* Page Header */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
          <div>
            <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
              <IconBuildingWarehouse className='h-6 w-6' />
              <span>Tổng Hợp Đơn Hàng Tại Kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
            </h1>
            <p className='text-xs text-slate-500 mt-0.5'>
              Theo dõi, tra cứu và in lại tem nhãn nhận diện A4 cho các lô hàng lưu kho và xuất kho.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportStoredOrdersExcel}
              disabled={isExporting}
              className='h-8 text-xs font-bold border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 shadow-sm'
              title={
                statusFilter === 'INBOUND'
                  ? 'Tải về file Excel danh sách đơn hàng đang lưu kho'
                  : statusFilter === 'COMPLETED_INBOUND'
                    ? 'Tải về file Excel danh sách đơn hàng đã xuất kho'
                    : statusFilter === 'DRAFT'
                      ? 'Tải về file Excel danh sách đơn hàng nháp'
                      : 'Tải về file Excel danh sách tất cả các đơn hàng'
              }
              data-testid='export-stored-orders-excel-btn'
            >
              {isExporting ? (
                <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin text-emerald-600' />
              ) : (
                <IconFileSpreadsheet className='mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
              )}
              <span>
                {statusFilter === 'INBOUND'
                  ? 'Xuất Excel lưu kho'
                  : statusFilter === 'COMPLETED_INBOUND'
                    ? 'Xuất Excel đã xuất'
                    : statusFilter === 'DRAFT'
                      ? 'Xuất Excel đơn nháp'
                      : 'Xuất Excel tất cả'}
              </span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={fetchOrders}
              disabled={isLoading || isExporting}
              className='h-8 text-xs font-bold border-slate-300'
            >
              <IconRefresh className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Main Filter & Data Table Card */}
        <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
          <CardContent className='p-1 space-y-1.5'>
            {/* Toolbar */}
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='relative flex-1 min-w-[260px]'>
                <IconSearch className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder='Tìm kiếm theo mã đơn hoặc tên hàng...'
                  className='pl-9 h-9 text-xs'
                />
              </div>

              <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold'>
                {['ALL', 'INBOUND', 'DRAFT', 'COMPLETED_INBOUND'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setStatusFilter(tab);
                      setPage(1);
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                        : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                    }`}
                  >
                    {tab === 'ALL'
                      ? `Tất cả${meta.allCount != null ? ` (${meta.allCount})` : ''}`
                      : tab === 'INBOUND'
                        ? `LƯU KHO${meta.storedCount != null ? ` (${meta.storedCount})` : ''}`
                        : tab === 'DRAFT'
                          ? `ĐƠN NHÁP${meta.draftCount != null ? ` (${meta.draftCount})` : ''}`
                          : `ĐÃ XUẤT KHO${meta.dispatchedCount != null ? ` (${meta.dispatchedCount})` : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className='border rounded-lg overflow-x-auto'>
              <table className='w-full text-[11px] text-left min-w-[1050px]'>
                <thead className='bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[10px] sticky top-0 z-10 uppercase'>
                  <tr>
                    <th className='py-1 px-1.5 w-[40px] text-center'>STT</th>
                    <th className='py-1 px-1.5 w-[110px] font-mono'>NGÀY NHẬP</th>
                    <th className='py-1 px-1.5 w-[110px] font-mono'>MÃ VẬN ĐƠN</th>
                    <th className='py-1 px-1.5 min-w-[160px]'>TÊN HÀNG HÓA</th>
                    <th
                      className='py-1 px-1.5 w-[95px] text-right font-mono'
                      title='Số lượng đang nằm tại kho / tổng số lượng của đơn'
                    >
                      SỐ LƯỢNG
                    </th>
                    <th className='py-1 px-1.5 w-[85px] text-right font-mono'>SỐ KG</th>
                    <th className='py-1 px-1.5 w-[80px] text-right font-mono'>CBM</th>
                    <th className='py-1 px-1.5 min-w-[140px]'>ĐÍCH ĐẾN</th>
                    <th className='py-1 px-1.5 w-[100px] text-center'>TRẠNG THÁI</th>
                    <th className='py-1 px-1.5 w-[110px] text-center font-mono'>NGÀY XUẤT</th>
                    <th className='py-1 px-1.5 w-[80px] text-center'>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className='p-2 text-center text-gray-500'>
                        <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                        Đang tải dữ liệu đơn hàng...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className='p-2 text-center text-gray-400'>
                        Không tìm thấy đơn hàng nào
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => {
                      const members: any[] =
                        Array.isArray(row.items) && row.items.length > 0 ? row.items : [row];
                      const isMulti = members.length > 1;
                      const isExpanded = isMulti && expandedCodes.has(row.orderCode);
                      const openDetail = (target: any) => {
                        setSelectedWaybill(target);
                        setIsDetailModalOpen(true);
                      };

                      return (
                        <React.Fragment key={`${row.orderCode}-${row.id}`}>
                          <tr
                            onClick={() =>
                              isMulti ? toggleExpanded(row.orderCode) : openDetail(members[0])
                            }
                            className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-blue-50/30 dark:bg-slate-800/30' : ''
                            }`}
                          >
                            <td className='py-1 px-1.5 text-center font-mono text-gray-400 text-[10px]'>
                              {((page - 1) * pageSize + idx + 1).toString().padStart(2, '0')}
                            </td>
                            <td className='py-1 px-1.5 font-mono text-slate-600 dark:text-slate-400 text-[10px]'>
                              {formatDateTime(row.inboundDate || row.createdAt)}
                            </td>
                            <td className='py-1 px-1.5'>
                              <div className='flex items-center gap-1'>
                                {isMulti &&
                                  (isExpanded ? (
                                    <IconChevronDown className='h-3 w-3 text-slate-500 shrink-0' />
                                  ) : (
                                    <IconChevronRight className='h-3 w-3 text-slate-500 shrink-0' />
                                  ))}
                                <span className='font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]'>
                                  {row.orderCode}
                                </span>
                                {isMulti && (
                                  <Badge
                                    variant='outline'
                                    className='text-[9px] px-1 py-0 h-3.5 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  >
                                    {members.length} dòng
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td
                              className='py-1 px-1.5 text-[10px] font-medium text-slate-800 dark:text-slate-200 max-w-[220px] truncate'
                              title={row.goodsDescription || 'Hàng tổng hợp'}
                            >
                              {row.goodsDescription || 'Hàng tổng hợp'}
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono text-[10px] whitespace-nowrap'>
                              {renderStock(row)}
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono text-[10px] text-slate-700 dark:text-slate-300'>
                              {(Number(row.totalWeight) || 0).toLocaleString('vi-VN')}
                            </td>
                            <td className='py-1 px-1.5 text-right font-mono text-[10px] text-slate-700 dark:text-slate-300'>
                              {(Number(row.totalVolume) || 0).toLocaleString('vi-VN', {
                                maximumFractionDigits: 3
                              })}
                            </td>
                            <td
                              className='py-1 px-1.5 text-[10px] text-slate-700 dark:text-slate-300 max-w-[180px] truncate'
                              title={row.destinationHub || row.route || 'Giao khách lẻ'}
                            >
                              <span className='text-indigo-600 dark:text-indigo-400 font-medium'>
                                {row.destinationHub || row.route || 'Giao khách lẻ'}
                              </span>
                            </td>
                            <td className='py-1 px-1.5 text-center'>
                              {renderWarehouseOrderStatusBadge(resolveDisplayStatus(row))}
                            </td>
                            <td className='py-1 px-1.5 text-center'>{renderOutboundDate(row)}</td>
                            <td
                              className='py-1 px-1.5 text-center'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isMulti ? (
                                <div className='flex items-center justify-center gap-1'>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() => toggleExpanded(row.orderCode)}
                                    className='h-7 px-1.5 text-[10px] text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                    title='Xem từng dòng hàng của đơn'
                                  >
                                    {isExpanded ? 'Thu gọn' : 'Xem dòng'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() => openDetail(row)}
                                    className='h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                    title='Xem chi tiết tổng hợp'
                                  >
                                    <IconEye className='h-4 w-4' />
                                  </Button>
                                </div>
                              ) : (
                                renderActions(members[0], openDetail)
                              )}
                            </td>
                          </tr>

                          {isExpanded &&
                            members.map((m, mIdx) => (
                              <tr
                                key={`member-${m.id}`}
                                onClick={() => openDetail(m)}
                                className='bg-slate-50/60 dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors'
                              >
                                <td className='py-1 px-1.5 text-center font-mono text-gray-300 text-[10px]'>
                                  {mIdx + 1}
                                </td>
                                <td className='py-1 px-1.5 font-mono text-slate-500 text-[10px]'>
                                  {formatDateTime(
                                    m.inboundDate || m.createdAt || row.inboundDate || row.createdAt
                                  )}
                                </td>
                                <td className='py-1 px-1.5 pl-3'>
                                  <span className='font-mono text-slate-700 dark:text-slate-300 text-[10px] font-semibold'>
                                    Dòng {mIdx + 1}
                                  </span>
                                </td>
                                <td
                                  className='py-1 px-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 max-w-[220px] truncate'
                                  title={m.goodsDescription || '—'}
                                >
                                  {m.goodsDescription || '—'}
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono text-[10px] whitespace-nowrap'>
                                  {renderStock(m)}
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono text-[10px] text-slate-600 dark:text-slate-400'>
                                  {(Number(m.totalWeight) || 0).toLocaleString('vi-VN')}
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono text-[10px] text-slate-600 dark:text-slate-400'>
                                  {(Number(m.totalVolume) || 0).toLocaleString('vi-VN', {
                                    maximumFractionDigits: 3
                                  })}
                                </td>
                                <td
                                  className='py-1 px-1.5 text-[10px] text-slate-600 dark:text-slate-400 max-w-[180px] truncate'
                                  title={
                                    m.destinationHub ||
                                    m.destinationHubEntity?.name ||
                                    m.route ||
                                    'Giao khách lẻ'
                                  }
                                >
                                  <span className='text-indigo-600 dark:text-indigo-400 font-medium'>
                                    {m.destinationHub ||
                                      m.destinationHubEntity?.name ||
                                      m.route ||
                                      'Giao khách lẻ'}
                                  </span>
                                </td>
                                <td className='py-1 px-1.5 text-center'>
                                  {renderWarehouseOrderStatusBadge(resolveDisplayStatus(m))}
                                </td>
                                <td className='py-1 px-1.5 text-center'>{renderOutboundDate(m)}</td>
                                <td
                                  className='py-1 px-1.5 text-center'
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {renderActions(m, openDetail)}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar with Page Size Selector */}
            <div className='pt-2 border-t border-slate-100 dark:border-slate-800'>
              <TablePaginationBar
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20, 50, 100]}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Modal In Tem A4 */}
        <PalletLabelA4Modal
          isOpen={!!printData}
          onClose={() => setPrintData(null)}
          data={printData}
        />

        {/* Modal Chi Tiết Vận Đơn & Timeline 3 Chặng Xe */}
        <WarehouseWaybillDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          waybill={selectedWaybill}
          onPrintLabel={(w) => {
            setIsDetailModalOpen(false);
            setPrintData({
              orderCode: w.orderCode,
              goodsDescription: w.goodsDescription || '',
              totalQuantity: w.totalQuantity ?? 0,
              packagesOnPallet: w.totalQuantity ?? 0,
              palletIndex: 1,
              totalPallets: 1,
              destinationHub: w.destinationHub || w.route,
              province: w.province || w.destinationHubEntity?.city || w.destinationHub,
              destinationHubEntity: w.destinationHubEntity,
              warehouseName: w.currentHubEntity?.name,
              createdAt: w.createdAt
            });
          }}
        />
      </div>
    </PageContainer>
  );
}
