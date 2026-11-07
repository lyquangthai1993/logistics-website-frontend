'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuildingWarehouse,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconClock,
  IconDownload,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconRoute,
  IconSearch,
  IconTruck,
  IconX
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WarehouseHubFilterSelect } from '@/features/warehouse/components/warehouse-hub-filter-select';

export interface TripOrderLineItem {
  txId: number;
  orderId: number;
  orderCode: string;
  goodsDescription: string | null;
  originHub: string | null;
  destinationHub: string | null;
  route: string | null;
  quantity: number;
  totalOrderQuantity: number;
  weightKg: number;
  volumeCbm: number;
  confirmedAt: string;
  notes: string | null;
}

export interface DailyTripDetailItem {
  tripKey: string;
  tripCode: string;
  invoiceCode: string | null;
  reportDate: string;
  fullDateLabel: string;
  windowLabel: string;
  confirmedAt: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
  isInbound: boolean;
  hubId: number;
  hubCode: string | null;
  hubName: string;
  hubLevel: number;
  licensePlate: string | null;
  driverName: string | null;
  destination: string | null;
  orderCount: number;
  packageCount: number;
  weightKg: number;
  weightTons: number;
  volumeCbm: number;
  orders: TripOrderLineItem[];
}

export interface PendingTripItem {
  tripCode: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
  status: string;
  hubId: number;
  hubCode: string | null;
  hubName: string;
  hubLevel: number;
  licensePlate: string | null;
  driverName: string | null;
  orderCount: number;
  packageCount: number;
  weightKg: number;
  weightTons: number;
  volumeCbm: number;
  createdAt: string;
}

export interface DailyTripsDetailResponse {
  filter: {
    reportDate: string;
    fullDateLabel: string;
    prevReportDate: string;
    nextReportDate: string;
    windowStart: string;
    windowEnd: string;
    windowLabel: string;
    isClosed: boolean;
    isCurrentOpen: boolean;
    hubId: number | 'ALL';
    hubName: string;
    direction: 'INBOUND' | 'OUTBOUND' | 'ALL';
  };
  daySummary: {
    totalTrips: number;
    totalOrders: number;
    totalPackages: number;
    totalCbm: number;
    totalWeightKg: number;
    totalTons: number;
    inboundTrips: number;
    inboundOrders: number;
    inboundPackages: number;
    inboundCbm: number;
    inboundWeightKg: number;
    inboundTons: number;
    outboundTrips: number;
    transferTrips: number;
    directOutboundTrips: number;
    outboundOrders: number;
    outboundPackages: number;
    outboundCbm: number;
    outboundWeightKg: number;
    outboundTons: number;
    activeHubCount: number;
    pendingTripsCount?: number;
  };
  hubSummary: Array<{
    hubId: number;
    hubCode: string | null;
    hubName: string;
    hubLevel: number;
    inboundTrips: number;
    inboundCbm: number;
    inboundTons: number;
    inboundPackages: number;
    outboundTrips: number;
    outboundCbm: number;
    outboundTons: number;
    outboundPackages: number;
    totalTrips: number;
  }>;
  trips: DailyTripDetailItem[];
  pendingTrips?: PendingTripItem[];
  recentDaysStrip: Array<{
    reportDate: string;
    dayLabel: string;
    fullDateLabel: string;
    windowLabel: string;
    inboundTrips: number;
    outboundTrips: number;
    totalTrips: number;
    inboundCbm: number;
    outboundCbm: number;
    totalCbm: number;
  }>;
}

function formatNumberVn(val: number, maxDecimals = 1): string {
  if (!Number.isFinite(val)) return '0';
  return val.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
}

function formatDateTimeVn(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function renderHubLevelBadge(
  level?: number | null,
  code?: string | null,
  name?: string | null
) {
  const isSatellite = Boolean(
    (level && level > 1) ||
      code?.startsWith('XB-') ||
      code?.startsWith('HUB-BO-') ||
      name?.toLowerCase().includes('xe bo')
  );
  if (isSatellite) {
    return (
      <Badge
        variant='outline'
        className='text-[10px] px-1 py-0 h-4 bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300'
      >
        Cấp 2 • Trạm Xe Bo
      </Badge>
    );
  }
  return (
    <Badge
      variant='outline'
      className='text-[10px] px-1 py-0 h-4 bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300'
    >
      Cấp 1 • Hub Chính
    </Badge>
  );
}

export function SuperAdminDailyTripsTracker() {
  const searchParams = useSearchParams();
  const initialDateParam = searchParams.get('date') || '';
  const initialHubParam = searchParams.get('hubId') || 'ALL';
  const initialDirectionParam = (
    searchParams.get('direction') || 'ALL'
  ).toUpperCase();

  const [reportDate, setReportDate] = useState<string>(initialDateParam);
  const [selectedHubId, setSelectedHubId] = useState<string>(initialHubParam);
  const [direction, setDirection] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>(
    initialDirectionParam === 'INBOUND' || initialDirectionParam === 'OUTBOUND'
      ? initialDirectionParam
      : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTripKeys, setExpandedTripKeys] = useState<
    Record<string, boolean>
  >({});

  const { data, isLoading, isFetching, refetch } =
    useQuery<DailyTripsDetailResponse>({
      queryKey: [
        'admin-daily-trips-detail',
        reportDate,
        selectedHubId,
        direction
      ],
      queryFn: async () => {
        const params: Record<string, string> = {
          direction
        };
        if (reportDate && /^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
          params.reportDate = reportDate;
        }
        if (selectedHubId && selectedHubId !== 'ALL') {
          params.hubId = selectedHubId;
        }
        const res = await apiClient.get<
          DailyTripsDetailResponse | { data: DailyTripsDetailResponse }
        >('/api/v1/admin/reports/operational/daily-trips', { params });
        const raw = res.data as { data?: DailyTripsDetailResponse } &
          DailyTripsDetailResponse;
        const resolved = raw?.data ?? raw;
        if (!reportDate && resolved?.filter?.reportDate) {
          setReportDate(resolved.filter.reportDate);
        }
        return resolved;
      },
      staleTime: 15 * 1000
    });

  const activeDate = data?.filter?.reportDate || reportDate;
  const daySummary = data?.daySummary;
  const hubSummary = data?.hubSummary ?? [];
  const recentDaysStrip = data?.recentDaysStrip ?? [];
  const pendingTrips = data?.pendingTrips ?? [];

  const handleExportExcel = () => {
    if (!data) {
      toast.error('Chưa có dữ liệu để xuất Excel');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      const tripRows = filteredTrips.map((t, idx) => ({
        STT: idx + 1,
        'Ngày báo cáo': t.fullDateLabel,
        'Khung giờ chốt': t.windowLabel,
        'Mã chuyến (TRIP)': t.tripCode,
        'Mã phiếu kho': t.invoiceCode || '—',
        'Loại vận hành':
          t.direction === 'INBOUND'
            ? 'Xe nhập kho'
            : t.direction === 'TRANSFER'
              ? 'Trung chuyển liên Hub'
              : 'Xe xuất kho',
        'Chi nhánh Kho': t.hubName,
        'Mã Hub': t.hubCode || '—',
        'Phân cấp Hub':
          t.hubLevel > 1 ? 'Cấp 2 • Trạm Xe Bo' : 'Cấp 1 • Hub Chính',
        'Biển số xe': t.licensePlate || '—',
        'Tài xế': t.driverName || '—',
        'Số đơn hàng': t.orderCount,
        'Tổng số kiện': t.packageCount,
        'Thể tích (CBM)': t.volumeCbm,
        'Trọng lượng (Tấn)': t.weightTons,
        'Trọng lượng (Kg)': t.weightKg,
        'Giờ xác nhận': formatDateTimeVn(t.confirmedAt)
      }));

      const orderRows = filteredTrips.flatMap((t) =>
        t.orders.map((o, oIdx) => ({
          'Mã chuyến (TRIP)': t.tripCode,
          'Loại vận hành':
            t.direction === 'INBOUND'
              ? 'Xe nhập kho'
              : t.direction === 'TRANSFER'
                ? 'Trung chuyển liên Hub'
                : 'Xe xuất kho',
          'Chi nhánh Kho': t.hubName,
          'Biển số xe': t.licensePlate || '—',
          'Tài xế': t.driverName || '—',
          'STT đơn trong chuyến': oIdx + 1,
          'Mã vận đơn': o.orderCode,
          'Mô tả hàng hóa': o.goodsDescription || 'Hàng vận chuyển',
          'Kho đi': o.originHub || '—',
          'Kho đến / Tuyến': o.destinationHub || o.route || '—',
          'Kiện xác nhận': o.quantity,
          'Tổng kiện đơn': o.totalOrderQuantity,
          'Số Khối (CBM)': o.volumeCbm,
          'Trọng lượng (Kg)': o.weightKg,
          'Giờ xác nhận': formatDateTimeVn(o.confirmedAt)
        }))
      );

      const pendingRows = pendingTrips.map((p, idx) => ({
        STT: idx + 1,
        'Mã chuyến nháp (TRIP)': p.tripCode,
        'Trạng thái': 'Chưa xác nhận (PENDING)',
        'Loại dự kiến':
          p.direction === 'INBOUND'
            ? 'Xe nhập kho'
            : p.direction === 'TRANSFER'
              ? 'Trung chuyển liên Hub'
              : 'Xe xuất kho',
        'Chi nhánh Kho': p.hubName,
        'Biển số xe': p.licensePlate || '—',
        'Tài xế': p.driverName || '—',
        'Số đơn': p.orderCount,
        'Số kiện': p.packageCount,
        'Thể tích (CBM)': p.volumeCbm,
        'Trọng lượng (Tấn)': p.weightTons,
        'Thời điểm tạo nháp': formatDateTimeVn(p.createdAt)
      }));

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          tripRows.length > 0
            ? tripRows
            : [{ 'Thông báo': 'Không có chuyến xe xác nhận trong ngày chọn' }]
        ),
        'Danh_Sach_TRIP_Xac_Nhan'
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          orderRows.length > 0
            ? orderRows
            : [{ 'Thông báo': 'Không có đơn hàng trong ngày chọn' }]
        ),
        'Chi_Tiet_Don_Hang_TRIP'
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          pendingRows.length > 0
            ? pendingRows
            : [{ 'Thông báo': '0 chuyến xe nháp tồn đọng' }]
        ),
        'Chuyen_Xe_Chua_Xac_Nhan'
      );

      XLSX.writeFile(
        wb,
        `Bang_Ke_Chuyen_Xe_TRIP_${activeDate || 'Hom_Nay'}.xlsx`
      );
      toast.success(
        `Đã xuất file Excel bảng kê TRIP ngày ${data.filter?.fullDateLabel || activeDate}`
      );
    } catch {
      toast.error('Không thể xuất file Excel');
    }
  };

  const filteredTrips = useMemo(() => {
    const list = data?.trips ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (t) =>
        t.tripCode.toLowerCase().includes(q) ||
        (t.invoiceCode || '').toLowerCase().includes(q) ||
        (t.licensePlate || '').toLowerCase().includes(q) ||
        (t.driverName || '').toLowerCase().includes(q) ||
        t.hubName.toLowerCase().includes(q) ||
        t.orders.some(
          (o) =>
            o.orderCode.toLowerCase().includes(q) ||
            (o.goodsDescription || '').toLowerCase().includes(q)
        )
    );
  }, [data?.trips, searchQuery]);

  const toggleExpandTrip = (tripKey: string) => {
    setExpandedTripKeys((prev) => ({
      ...prev,
      [tripKey]: !prev[tripKey]
    }));
  };

  return (
    <div
      className='space-y-2 pb-2'
      data-testid='super-admin-daily-trips-page'
    >
      {/* 1. Thanh điều khiển & Bộ lọc Ngày cụ thể (Single-Day Global Filter Bar) */}
      <Card
        className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
        data-testid='daily-trips-filter-bar'
      >
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <Link href='/dashboard/admin/reports'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  data-testid='btn-back-to-reports'
                  className='h-8 px-2 text-xs font-semibold cursor-pointer'
                >
                  <IconArrowLeft className='h-3.5 w-3.5 mr-1' />
                  Báo cáo tổng hợp
                </Button>
              </Link>

              {/* Chọn 1 ngày cụ thể kèm nút Lùi / Tiến ngày */}
              <div className='inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 h-8'>
                <button
                  type='button'
                  onClick={() => {
                    if (data?.filter?.prevReportDate) {
                      setReportDate(data.filter.prevReportDate);
                    }
                  }}
                  data-testid='btn-prev-day'
                  className='h-6 w-6 inline-flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  title='Ngày trước'
                >
                  <IconChevronLeft className='h-3.5 w-3.5' />
                </button>
                <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400 shrink-0' />
                <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                  Ngày báo cáo:
                </span>
                <input
                  type='date'
                  value={activeDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  data-testid='daily-trips-date-input'
                  className='text-xs font-mono font-bold bg-transparent outline-none text-foreground cursor-pointer'
                />
                <button
                  type='button'
                  onClick={() => {
                    if (data?.filter?.nextReportDate) {
                      setReportDate(data.filter.nextReportDate);
                    }
                  }}
                  data-testid='btn-next-day'
                  className='h-6 w-6 inline-flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  title='Ngày kế tiếp'
                >
                  <IconChevronRight className='h-3.5 w-3.5' />
                </button>
              </div>

              <WarehouseHubFilterSelect
                value={selectedHubId}
                onChange={(val) => setSelectedHubId(val)}
              />

              {/* Lọc Chiều Xe Nhập / Xe Xuất */}
              <div
                className='inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900 p-0.5 h-8'
                data-testid='daily-trips-direction-toggle'
              >
                <button
                  type='button'
                  onClick={() => setDirection('ALL')}
                  data-testid='daily-dir-all'
                  className={`h-7 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    direction === 'ALL'
                      ? 'bg-[#0F3D62] text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Tất cả ({daySummary?.totalTrips ?? 0} xe)
                </button>
                <button
                  type='button'
                  onClick={() => setDirection('INBOUND')}
                  data-testid='daily-dir-inbound'
                  className={`h-7 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    direction === 'INBOUND'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Xe nhập kho ({daySummary?.inboundTrips ?? 0} xe)
                </button>
                <button
                  type='button'
                  onClick={() => setDirection('OUTBOUND')}
                  data-testid='daily-dir-outbound'
                  className={`h-7 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    direction === 'OUTBOUND'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Xe xuất kho ({daySummary?.outboundTrips ?? 0} xe)
                </button>
              </div>
            </div>

            <div className='flex items-center gap-1.5'>
              <div className='relative w-56'>
                <IconSearch className='h-3.5 w-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2' />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Tìm mã TRIP, biển số, tài xế, mã đơn...'
                  data-testid='daily-trips-search-input'
                  className='h-8 pl-7 pr-6 text-xs'
                />
                {searchQuery && (
                  <button
                    type='button'
                    onClick={() => setSearchQuery('')}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                  >
                    <IconX className='h-3 w-3' />
                  </button>
                )}
              </div>

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleExportExcel}
                disabled={isLoading || !data}
                data-testid='btn-export-daily-trips-excel'
                className='h-8 px-2.5 text-xs font-semibold cursor-pointer border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              >
                <IconDownload className='h-3.5 w-3.5 mr-1' />
                Xuất Excel
              </Button>

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void refetch()}
                disabled={isFetching}
                data-testid='btn-refresh-daily-trips'
                className='h-8 px-2.5 text-xs font-semibold cursor-pointer'
              >
                <IconRefresh
                  className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`}
                />
                Làm mới
              </Button>
            </div>
          </div>

          {/* Dải 14 ngày chọn nhanh (Quick Day Strip): Xem nhanh mỗi ngày có bao nhiêu xe nhập / xuất */}
          <div
            className='flex items-center gap-1 overflow-x-auto py-1 border-t border-slate-200/80 dark:border-slate-800'
            data-testid='recent-days-strip'
          >
            <span className='text-[10px] font-bold uppercase text-muted-foreground shrink-0 mr-1'>
              Chọn nhanh ngày:
            </span>
            {recentDaysStrip.map((d) => {
              const isSelected = d.reportDate === activeDate;
              return (
                <button
                  key={d.reportDate}
                  type='button'
                  onClick={() => setReportDate(d.reportDate)}
                  data-testid={`strip-day-${d.reportDate}`}
                  className={`shrink-0 rounded border px-2 py-1 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#0F3D62] bg-[#0F3D62] text-white shadow-2xs'
                      : d.totalTrips > 0
                        ? 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-muted-foreground hover:bg-slate-100'
                  }`}
                >
                  <div className='text-[10px] font-mono font-bold'>
                    {d.dayLabel}
                  </div>
                  <div
                    className={`text-[9px] font-mono ${
                      isSelected ? 'text-sky-100' : 'text-muted-foreground'
                    }`}
                  >
                    N:{d.inboundTrips} • X:{d.outboundTrips} xe
                  </div>
                </button>
              );
            })}
          </div>

          {/* Banner Khung giờ 18:00 D-1 -> 18:00 D của ngày đang chọn */}
          <div
            className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 text-[10px]'
            data-testid='daily-trips-window-banner'
          >
            <div className='flex flex-wrap items-center gap-1.5'>
              <IconClock className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0' />
              <span className='font-bold text-[#0F3D62] dark:text-blue-300'>
                Ngày báo cáo {data?.filter?.fullDateLabel || activeDate}:
              </span>
              <span className='font-mono font-bold text-blue-700 dark:text-blue-300'>
                Khung giờ chốt chuyến xe xác nhận: {data?.filter?.windowLabel || '—'}
              </span>
              <span className='text-muted-foreground'>
                ({data?.filter?.hubName || 'Tất cả Chi nhánh'})
              </span>
            </div>
            <div>
              {data?.filter?.isCurrentOpen ? (
                <Badge className='bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 text-[10px] px-1.5 py-0'>
                  Kỳ đang mở (Chốt lúc 18:00)
                </Badge>
              ) : (
                <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1.5 py-0'>
                  Đã chốt sổ 18:00
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 4 Thẻ KPI Thống kê Số lượng Xe Nhập / Xe Xuất trong ngày */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2'>
        <Card className='p-2 border-l-4 border-l-[#0F3D62] shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Tổng số chuyến xe trong ngày
              </span>
              <IconRoute className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-[#0F3D62] dark:text-blue-300'
              data-testid='daily-kpi-total-trips'
            >
              {daySummary?.totalTrips ?? 0} chuyến xe (TRIP)
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span>
                Đơn hàng:{' '}
                <strong className='font-mono text-foreground'>
                  {daySummary?.totalOrders ?? 0} đơn
                </strong>
              </span>
              <span className='font-mono'>
                Tổng: {daySummary?.totalPackages ?? 0} kiện
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2 border-l-4 border-l-blue-600 shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300'>
                Số lượng Xe Nhập Kho
              </span>
              <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-blue-700 dark:text-blue-300'
              data-testid='daily-kpi-inbound-trips'
            >
              {daySummary?.inboundTrips ?? 0} xe nhập kho
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span className='font-mono font-semibold text-foreground'>
                {formatNumberVn(daySummary?.inboundCbm ?? 0, 1)} CBM •{' '}
                {formatNumberVn(daySummary?.inboundTons ?? 0, 2)} Tấn
              </span>
              <span className='font-mono'>
                {daySummary?.inboundPackages ?? 0} kiện
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2 border-l-4 border-l-emerald-600 shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300'>
                Số lượng Xe Xuất Kho
              </span>
              <IconTruck className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300'
              data-testid='daily-kpi-outbound-trips'
            >
              {daySummary?.outboundTrips ?? 0} xe xuất kho
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span className='font-mono font-semibold text-foreground'>
                {formatNumberVn(daySummary?.outboundCbm ?? 0, 1)} CBM •{' '}
                {formatNumberVn(daySummary?.outboundTons ?? 0, 2)} Tấn
              </span>
              <span className='font-mono'>
                {daySummary?.outboundPackages ?? 0} kiện
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2 border-l-4 border-l-purple-600 shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Tổng khối lượng &amp; Chi nhánh hoạt động
              </span>
              <IconPackage className='h-3.5 w-3.5 text-purple-600 dark:text-purple-400' />
            </div>
            <div className='text-lg font-extrabold font-mono text-purple-700 dark:text-purple-300'>
              {formatNumberVn(daySummary?.totalCbm ?? 0, 1)} CBM /{' '}
              {formatNumberVn(daySummary?.totalTons ?? 0, 2)} Tấn
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span>
                Kho phát sinh chuyến:{' '}
                <strong className='font-mono text-foreground'>
                  {daySummary?.activeHubCount ?? 0} kho
                </strong>
              </span>
              <span className='font-mono'>
                ({formatNumberVn(daySummary?.totalWeightKg ?? 0, 0)} kg)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bảng Tóm tắt Số xe Nhập / Xuất theo từng Chi nhánh Kho trong ngày */}
      {hubSummary.length > 0 && (
        <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
          <CardContent className='p-0 space-y-1.5'>
            <div className='flex items-center justify-between border-b pb-1'>
              <span className='text-xs font-bold uppercase text-slate-800 dark:text-slate-200'>
                Phân bổ số chuyến xe Nhập / Xuất theo Chi nhánh Kho trong ngày{' '}
                {data?.filter?.fullDateLabel}
              </span>
              <span className='text-[10px] text-muted-foreground'>
                Bấm vào dòng Kho để lọc riêng chuyến xe của kho đó
              </span>
            </div>
            <div className='max-h-44 overflow-auto rounded border'>
              <table className='w-full border-collapse text-left'>
                <thead className='sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10'>
                  <tr className='text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300'>
                    <th className='py-1 px-1.5'>Chi nhánh Kho (Hub)</th>
                    <th className='py-1 px-1.5'>Phân cấp Hub</th>
                    <th className='py-1 px-1.5 text-right'>
                      Số xe Nhập kho
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Sản lượng Nhập (CBM / Tấn / Kiện)
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Số xe Xuất kho
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Sản lượng Xuất (CBM / Tấn / Kiện)
                    </th>
                    <th className='py-1 px-1.5 text-right'>Tổng chuyến</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60'>
                  {hubSummary.map((h) => {
                    const isSatellite = Boolean(
                      h.hubLevel > 1 ||
                        h.hubCode?.startsWith('XB-') ||
                        h.hubCode?.startsWith('HUB-BO-')
                    );
                    const isSelectedHub =
                      String(selectedHubId) === String(h.hubId);
                    return (
                      <tr
                        key={h.hubId}
                        onClick={() =>
                          setSelectedHubId(
                            isSelectedHub ? 'ALL' : String(h.hubId)
                          )
                        }
                        className={`text-[10px] hover:bg-muted/60 cursor-pointer ${
                          isSelectedHub
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-l-4 border-l-blue-600'
                            : ''
                        }`}
                      >
                        <td className='py-1 px-1.5'>
                          <div className='flex items-center gap-1.5'>
                            {isSatellite ? (
                              <IconTruck className='h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0' />
                            ) : (
                              <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0' />
                            )}
                            <span className='font-semibold'>{h.hubName}</span>
                            {h.hubCode && (
                              <span
                                className={`rounded border px-1 py-0 text-[10px] font-mono font-bold ${
                                  isSatellite
                                    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300'
                                }`}
                              >
                                {h.hubCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='py-1 px-1.5'>
                          {renderHubLevelBadge(
                            h.hubLevel,
                            h.hubCode,
                            h.hubName
                          )}
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono font-bold text-blue-700 dark:text-blue-300'>
                          {h.inboundTrips} xe nhập
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono'>
                          {formatNumberVn(h.inboundCbm, 1)} CBM •{' '}
                          {formatNumberVn(h.inboundTons, 2)} Tấn •{' '}
                          {h.inboundPackages} kiện
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300'>
                          {h.outboundTrips} xe xuất
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono'>
                          {formatNumberVn(h.outboundCbm, 1)} CBM •{' '}
                          {formatNumberVn(h.outboundTons, 2)} Tấn •{' '}
                          {h.outboundPackages} kiện
                        </td>
                        <td className='py-1 px-1.5 text-right font-mono font-extrabold text-[#0F3D62] dark:text-blue-300'>
                          {h.totalTrips} chuyến
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3.5. Khung Cảnh báo Chuyến xe Chưa xác nhận / Đang nháp trước giờ Cut-off 18:00 */}
      <Card
        className={`p-2 shadow-2xs ${
          pendingTrips.length > 0
            ? 'border-l-4 border-l-amber-500 border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20'
            : 'border-l-4 border-l-emerald-600 border-slate-200 dark:border-slate-800'
        }`}
        data-testid='pending-trips-alert-card'
      >
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5'>
            <div className='flex items-center gap-1.5'>
              {pendingTrips.length > 0 ? (
                <IconAlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0' />
              ) : (
                <IconCheck className='h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0' />
              )}
              <span className='text-xs font-bold uppercase text-slate-900 dark:text-slate-100'>
                Kiểm soát Chuyến xe Chưa xác nhận trước giờ Cut-off 18:00
              </span>
              {pendingTrips.length > 0 ? (
                <Badge className='bg-amber-500/20 text-amber-800 border-amber-500/30 dark:text-amber-300 text-[10px] font-mono px-1.5 py-0'>
                  {pendingTrips.length} chuyến nháp chờ xác nhận
                </Badge>
              ) : (
                <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] font-mono px-1.5 py-0'>
                  0 chuyến nháp tồn đọng
                </Badge>
              )}
            </div>
            <span className='text-[10px] text-muted-foreground'>
              {pendingTrips.length > 0
                ? 'Cần xác nhận Nhập/Xuất kho trước 18:00 để được ghi nhận vào sản lượng chốt ngày'
                : 'Tất cả chuyến xe trong kỳ đã được xác nhận Nhập/Xuất kho đầy đủ'}
            </span>
          </div>

          {pendingTrips.length > 0 && (
            <div className='max-h-36 overflow-auto rounded border bg-white dark:bg-slate-950'>
              <table
                className='w-full border-collapse text-left'
                data-testid='pending-trips-table'
              >
                <thead className='sticky top-0 bg-amber-100/70 dark:bg-slate-900 border-b z-10'>
                  <tr className='text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300'>
                    <th className='py-1 px-1.5'>Mã TRIP Nháp</th>
                    <th className='py-1 px-1.5'>Chiều vận hành</th>
                    <th className='py-1 px-1.5'>Chi nhánh Kho</th>
                    <th className='py-1 px-1.5'>Phân cấp Hub</th>
                    <th className='py-1 px-1.5'>Biển số / Tài xế</th>
                    <th className='py-1 px-1.5 text-right'>Đơn / Kiện</th>
                    <th className='py-1 px-1.5 text-right'>Dự kiến CBM / Tấn</th>
                    <th className='py-1 px-1.5'>Thời điểm tạo</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60 text-[10px]'>
                  {pendingTrips.map((pt) => (
                    <tr key={pt.tripCode} className='hover:bg-muted/50'>
                      <td className='py-1 px-1.5 font-mono font-bold text-[11px] text-amber-800 dark:text-amber-300'>
                        {pt.tripCode}
                      </td>
                      <td className='py-1 px-1.5'>
                        {pt.direction === 'INBOUND' ? (
                          <Badge className='bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300 text-[10px] px-1.5 py-0'>
                            Xe nhập kho
                          </Badge>
                        ) : pt.direction === 'TRANSFER' ? (
                          <Badge className='bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300 text-[10px] px-1.5 py-0'>
                            Trung chuyển liên Hub
                          </Badge>
                        ) : (
                          <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1.5 py-0'>
                            Xe xuất kho
                          </Badge>
                        )}
                      </td>
                      <td className='py-1 px-1.5 font-semibold'>{pt.hubName}</td>
                      <td className='py-1 px-1.5'>
                        {renderHubLevelBadge(
                          pt.hubLevel,
                          pt.hubCode,
                          pt.hubName
                        )}
                      </td>
                      <td className='py-1 px-1.5 font-mono'>
                        {pt.licensePlate || 'Chưa gán xe'} •{' '}
                        {pt.driverName || 'Chưa gán tài xế'}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono'>
                        {pt.orderCount} đơn • {pt.packageCount} kiện
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono font-semibold'>
                        {formatNumberVn(pt.volumeCbm, 1)} CBM •{' '}
                        {formatNumberVn(pt.weightTons, 2)} Tấn
                      </td>
                      <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                        {formatDateTimeVn(pt.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Danh sách Theo dõi chi tiết từng mã TRIP trong ngày (kèm bảng kê đơn hàng bên trong từng TRIP) */}
      <Card
        className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
        data-testid='daily-trips-detail-card'
      >
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
            <div>
              <h2 className='text-xs font-extrabold uppercase text-slate-900 dark:text-slate-100'>
                DANH SÁCH CHI TIẾT MÃ CHUYẾN XE (TRIP) XÁC NHẬN TRONG NGÀY{' '}
                {data?.filter?.fullDateLabel || activeDate} ({filteredTrips.length}{' '}
                chuyến)
              </h2>
              <p className='text-[10px] text-muted-foreground'>
                Bấm vào bất kỳ dòng mã TRIP nào để bung danh sách đơn hàng (vận đơn) nằm trong chuyến xe đó
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className='flex items-center justify-center py-8 text-xs text-muted-foreground gap-1.5'>
              <IconLoader2 className='h-4 w-4 animate-spin' />
              <span>Đang tải danh sách mã TRIP trong ngày...</span>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className='py-6 text-center text-xs text-muted-foreground'>
              Không có chuyến xe (TRIP) xác nhận Nhập/Xuất nào trong khung giờ{' '}
              {data?.filter?.windowLabel} khớp điều kiện lọc.
            </div>
          ) : (
            <div
              className='space-y-1.5'
              data-testid='daily-trips-list'
            >
              {filteredTrips.map((trip) => {
                const isExpanded = Boolean(expandedTripKeys[trip.tripKey]);
                const isSatellite = Boolean(
                  trip.hubLevel > 1 ||
                    trip.hubCode?.startsWith('XB-') ||
                    trip.hubCode?.startsWith('HUB-BO-')
                );
                return (
                  <div
                    key={trip.tripKey}
                    data-testid={`trip-item-${trip.tripCode}`}
                    className={`rounded border transition-colors ${
                      trip.isInbound
                        ? 'border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-800'
                        : 'border-l-4 border-l-emerald-600 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Dòng Header của từng mã TRIP */}
                    <button
                      type='button'
                      onClick={() => toggleExpandTrip(trip.tripKey)}
                      data-testid={`btn-toggle-trip-${trip.tripCode}`}
                      className='w-full text-left flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900 cursor-pointer'
                    >
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <span className='font-mono text-[11px] font-extrabold text-[#0F3D62] dark:text-blue-300'>
                          {trip.tripCode}
                        </span>
                        {trip.invoiceCode && (
                          <Badge
                            variant='outline'
                            className='font-mono text-[10px] px-1.5 py-0 h-4'
                          >
                            Phiếu: {trip.invoiceCode}
                          </Badge>
                        )}
                        {trip.direction === 'INBOUND' ? (
                          <Badge className='bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300 text-[10px] px-1.5 py-0 h-4'>
                            Xe nhập kho
                          </Badge>
                        ) : trip.direction === 'TRANSFER' ? (
                          <Badge className='bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300 text-[10px] px-1.5 py-0 h-4'>
                            Trung chuyển liên Hub
                          </Badge>
                        ) : (
                          <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1.5 py-0 h-4'>
                            Xe xuất kho
                          </Badge>
                        )}

                        <div className='inline-flex items-center gap-1 text-[10px]'>
                          {isSatellite ? (
                            <IconTruck className='h-3.5 w-3.5 text-purple-600 dark:text-purple-400' />
                          ) : (
                            <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
                          )}
                          <span className='font-semibold'>{trip.hubName}</span>
                          {renderHubLevelBadge(
                            trip.hubLevel,
                            trip.hubCode,
                            trip.hubName
                          )}
                        </div>

                        {trip.licensePlate && (
                          <span className='text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200'>
                            • Biển số: {trip.licensePlate}
                          </span>
                        )}
                        {trip.driverName && (
                          <span className='text-[10px] text-muted-foreground'>
                            • Tài xế: {trip.driverName}
                          </span>
                        )}
                      </div>

                      <div className='flex flex-wrap items-center gap-2 text-[10px]'>
                        <span className='font-mono text-muted-foreground'>
                          Xác nhận lúc:{' '}
                          <strong className='text-foreground'>
                            {formatDateTimeVn(trip.confirmedAt)}
                          </strong>
                        </span>
                        <Badge
                          variant='outline'
                          className='font-mono text-[10px] px-1.5 py-0 h-4 bg-white dark:bg-slate-950'
                        >
                          {trip.orderCount} đơn • {trip.packageCount} kiện
                        </Badge>
                        <Badge className='font-mono text-[10px] px-1.5 py-0 h-4 bg-[#0F3D62] text-white'>
                          {formatNumberVn(trip.volumeCbm, 1)} CBM •{' '}
                          {formatNumberVn(trip.weightTons, 2)} Tấn
                        </Badge>
                        <span className='inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300'>
                          {isExpanded ? (
                            <>
                              Thu gọn <IconChevronUp className='h-3.5 w-3.5' />
                            </>
                          ) : (
                            <>
                              Chi tiết đơn ({trip.orders.length}){' '}
                              <IconChevronDown className='h-3.5 w-3.5' />
                            </>
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Bảng kê các đơn hàng nằm trong mã TRIP */}
                    {isExpanded && (
                      <div className='border-t bg-white dark:bg-slate-950 p-1.5 overflow-x-auto'>
                        <table className='w-full border-collapse text-left'>
                          <thead>
                            <tr className='text-[10px] font-bold uppercase text-slate-500 border-b'>
                              <th className='py-1 px-1.5'>STT</th>
                              <th className='py-1 px-1.5'>Mã vận đơn</th>
                              <th className='py-1 px-1.5'>Mô tả hàng hóa</th>
                              <th className='py-1 px-1.5'>Hành trình (Kho đi → Kho đến)</th>
                              <th className='py-1 px-1.5 text-right'>
                                Kiện xác nhận / Tổng kiện
                              </th>
                              <th className='py-1 px-1.5 text-right'>
                                Số Khối (CBM)
                              </th>
                              <th className='py-1 px-1.5 text-right'>
                                Trọng lượng (Kg)
                              </th>
                              <th className='py-1 px-1.5'>Giờ xác nhận</th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-border/50 text-[10px]'>
                            {trip.orders.map((ord, oIdx) => (
                              <tr
                                key={`${ord.txId}-${oIdx}`}
                                className='hover:bg-muted/40'
                              >
                                <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                                  {oIdx + 1}
                                </td>
                                <td className='py-1 px-1.5 font-mono text-[11px] font-bold text-[#0F3D62] dark:text-blue-300'>
                                  {ord.orderCode}
                                </td>
                                <td className='py-1 px-1.5'>
                                  {ord.goodsDescription || 'Hàng vận chuyển'}
                                </td>
                                <td className='py-1 px-1.5'>
                                  {ord.originHub || '—'} →{' '}
                                  {ord.destinationHub || ord.route || '—'}
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono font-bold'>
                                  {ord.quantity} / {ord.totalOrderQuantity} kiện
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300'>
                                  {formatNumberVn(ord.volumeCbm, 1)} CBM
                                </td>
                                <td className='py-1 px-1.5 text-right font-mono'>
                                  {formatNumberVn(ord.weightKg, 1)} kg
                                </td>
                                <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                                  {formatDateTimeVn(ord.confirmedAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
