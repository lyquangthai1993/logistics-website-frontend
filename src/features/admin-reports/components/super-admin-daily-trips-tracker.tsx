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
import { formatNumber } from '@/lib/utils';
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
    inboundTripCodes?: string[];
    outboundTripCodes?: string[];
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
  inboundTripsList?: DailyTripDetailItem[];
  outboundTripsList?: DailyTripDetailItem[];
  pendingTrips?: PendingTripItem[];
  recentDaysStrip: Array<{
    reportDate: string;
    dayLabel: string;
    fullDateLabel: string;
    windowLabel: string;
    inboundTrips: number;
    outboundTrips: number;
    totalTrips: number;
    inboundOrders?: number;
    outboundOrders?: number;
    totalOrders?: number;
    inboundCbm: number;
    outboundCbm: number;
    totalCbm: number;
    inboundWeightKg?: number;
    outboundWeightKg?: number;
    totalWeightKg?: number;
    inboundTons?: number;
    outboundTons?: number;
    totalTons?: number;
    inboundPackages?: number;
    outboundPackages?: number;
    totalPackages?: number;
    inboundTripCodes?: string[];
    outboundTripCodes?: string[];
  }>;
}

function formatNumberVn(val: number, maxDecimals = 1): string {
  return formatNumber(val, maxDecimals);
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

function formatTimeOnlyVn(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
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
  const recentDaysStrip = data?.recentDaysStrip ?? [];
  const pendingTrips = data?.pendingTrips ?? [];

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

  const inboundFilteredTrips = useMemo(
    () => filteredTrips.filter((t) => t.isInbound),
    [filteredTrips]
  );

  const outboundFilteredTrips = useMemo(
    () => filteredTrips.filter((t) => !t.isInbound),
    [filteredTrips]
  );

  // Full day inbound & outbound trip lists for the top glance summary table
  const allDayInboundTrips = useMemo(() => {
    if (data?.inboundTripsList) return data.inboundTripsList;
    return (data?.trips ?? []).filter((t) => t.isInbound);
  }, [data?.inboundTripsList, data?.trips]);

  const allDayOutboundTrips = useMemo(() => {
    if (data?.outboundTripsList) return data.outboundTripsList;
    return (data?.trips ?? []).filter((t) => !t.isInbound);
  }, [data?.outboundTripsList, data?.trips]);

  const toggleExpandTrip = (tripKey: string) => {
    setExpandedTripKeys((prev) => ({
      ...prev,
      [tripKey]: !prev[tripKey]
    }));
  };

  const handleFocusAndExpandTrip = (trip: DailyTripDetailItem) => {
    setExpandedTripKeys((prev) => ({
      ...prev,
      [trip.tripKey]: true
    }));
    const el = document.querySelector(
      `[data-testid="trip-item-${trip.tripCode}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleExportExcel = () => {
    if (!data) {
      toast.error('Chưa có dữ liệu để xuất Excel');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      const summarySheetRows = [
        {
          'Ngày báo cáo': data.filter?.fullDateLabel || activeDate,
          'Khung giờ chốt': data.filter?.windowLabel || '—',
          'Số chuyến Nhập kho': daySummary?.inboundTrips ?? 0,
          'Các mã TRIP Nhập': allDayInboundTrips
            .map((t) => t.tripCode)
            .join(', '),
          'Sản lượng Nhập (CBM)': daySummary?.inboundCbm ?? 0,
          'Sản lượng Nhập (Tấn)': daySummary?.inboundTons ?? 0,
          'Số kiện Nhập': daySummary?.inboundPackages ?? 0,
          'Số chuyến Xuất kho': daySummary?.outboundTrips ?? 0,
          'Các mã TRIP Xuất': allDayOutboundTrips
            .map((t) => t.tripCode)
            .join(', '),
          'Sản lượng Xuất (CBM)': daySummary?.outboundCbm ?? 0,
          'Sản lượng Xuất (Tấn)': daySummary?.outboundTons ?? 0,
          'Số kiện Xuất': daySummary?.outboundPackages ?? 0,
          'Tổng số chuyến trong ngày': daySummary?.totalTrips ?? 0,
          'Tổng sản lượng (CBM)': daySummary?.totalCbm ?? 0,
          'Tổng sản lượng (Tấn)': daySummary?.totalTons ?? 0,
          'Tổng số kiện': daySummary?.totalPackages ?? 0,
          'Tổng số đơn': daySummary?.totalOrders ?? 0
        }
      ];

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

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(summarySheetRows),
        'Tong_Hop_Ngay'
      );
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

  const renderTripSectionTable = (
    sectionTitle: string,
    sectionType: 'INBOUND' | 'OUTBOUND',
    tripsList: DailyTripDetailItem[],
    totalCbm: number,
    totalWeightKg: number,
    totalPackages: number,
    totalOrders: number
  ) => {
    const isInbound = sectionType === 'INBOUND';
    return (
      <Card
        className={`p-2 shadow-2xs border-slate-200 dark:border-slate-800 ${
          isInbound
            ? 'border-t-4 border-t-blue-600'
            : 'border-t-4 border-t-emerald-600'
        }`}
        data-testid={
          isInbound
            ? 'inbound-trips-table-section'
            : 'outbound-trips-table-section'
        }
      >
        <CardContent className='p-0 space-y-1.5'>
          {/* Header tổng hợp nhanh của bảng Nhập hoặc bảng Xuất */}
          <div
            className={`flex flex-wrap items-center justify-between gap-1.5 rounded px-2 py-1.5 border ${
              isInbound
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            <div className='flex items-center gap-1.5'>
              {isInbound ? (
                <IconBuildingWarehouse className='h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0' />
              ) : (
                <IconTruck className='h-4 w-4 text-emerald-700 dark:text-emerald-300 shrink-0' />
              )}
              <span
                className={`text-xs font-extrabold uppercase ${
                  isInbound
                    ? 'text-blue-900 dark:text-blue-200'
                    : 'text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {sectionTitle}: {tripsList.length} chuyến
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-1.5 text-[10px] font-mono'>
              <Badge
                variant='outline'
                className='text-[10px] font-mono font-bold px-1.5 py-0 h-5 bg-white dark:bg-slate-900'
              >
                {totalOrders} mã đơn ({totalPackages} kiện)
              </Badge>
              <Badge
                className={`text-[10px] font-mono font-bold px-1.5 py-0 h-5 ${
                  isInbound
                    ? 'bg-blue-700 text-white'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                Tổng: {formatNumberVn(totalWeightKg, 1)} kg •{' '}
                {formatNumberVn(totalCbm, 1)} m³
              </Badge>
            </div>
          </div>

          {tripsList.length === 0 ? (
            <div className='py-4 text-center text-[11px] text-muted-foreground border rounded bg-slate-50/40 dark:bg-slate-900/20'>
              Không có {isInbound ? 'chuyến nhập kho' : 'chuyến xuất kho'} xác nhận
              trong ngày {data?.filter?.fullDateLabel || activeDate}.
            </div>
          ) : (
            <div className='overflow-x-auto rounded border'>
              <table className='w-full border-collapse text-left'>
                <thead className='sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10'>
                  <tr className='text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300'>
                    <th className='py-1 px-1.5 w-8 text-center'>STT</th>
                    <th className='py-1 px-1.5'>Mã TRIP / Phiếu</th>
                    <th className='py-1 px-1.5'>Kho / Biển số / Tài xế</th>
                    <th className='py-1 px-1.5 text-right'>
                      Số mã đơn (SL)
                    </th>
                    <th className='py-1 px-1.5 text-right'>
                      Khối lượng (kg) &amp; Thể tích (m³)
                    </th>
                    <th className='py-1 px-1.5 text-right'>Giờ xác nhận</th>
                    <th className='py-1 px-1.5 text-right'>Vận đơn</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60 text-[10px]'>
                  {tripsList.map((trip, idx) => {
                    const isExpanded = Boolean(expandedTripKeys[trip.tripKey]);
                    return (
                      <React.Fragment key={trip.tripKey}>
                        <tr
                          data-testid={`trip-item-${trip.tripCode}`}
                          onClick={() => toggleExpandTrip(trip.tripKey)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded
                              ? isInbound
                                ? 'bg-blue-50/70 dark:bg-blue-950/40'
                                : 'bg-emerald-50/70 dark:bg-emerald-950/40'
                              : 'hover:bg-muted/60'
                          }`}
                        >
                          <td className='py-1 px-1.5 text-center font-mono text-muted-foreground'>
                            {idx + 1}
                          </td>
                          <td className='py-1 px-1.5'>
                            <div className='flex flex-wrap items-center gap-1'>
                              <span
                                className={`font-mono text-[11px] font-extrabold ${
                                  isInbound
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {trip.tripCode}
                              </span>
                              {trip.invoiceCode &&
                                trip.invoiceCode !== trip.tripCode && (
                                  <span className='font-mono text-[9px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 rounded'>
                                    {trip.invoiceCode}
                                  </span>
                                )}
                              {trip.direction === 'TRANSFER' && (
                                <Badge className='bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300 text-[9px] px-1 py-0 h-3.5'>
                                  Trung chuyển
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className='py-1 px-1.5'>
                            <div className='flex flex-wrap items-center gap-1'>
                              <span className='font-semibold text-foreground'>
                                {trip.hubName}
                              </span>
                              {trip.licensePlate && (
                                <span className='font-mono font-bold text-slate-700 dark:text-slate-200'>
                                  • {trip.licensePlate}
                                </span>
                              )}
                              {trip.driverName && (
                                <span className='text-muted-foreground'>
                                  ({trip.driverName})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='py-1 px-1.5 text-right font-mono whitespace-nowrap'>
                            <span className='font-bold'>{trip.orderCount}</span>{' '}
                            mã đơn{' '}
                            <span className='text-muted-foreground'>
                              ({trip.packageCount} kiện)
                            </span>
                          </td>
                          <td className='py-1 px-1.5 text-right font-mono whitespace-nowrap'>
                            <span className='font-bold text-foreground'>
                              {formatNumberVn(trip.weightKg, 1)} kg
                            </span>{' '}
                            •{' '}
                            <span
                              className={`font-extrabold ${
                                isInbound
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {formatNumberVn(trip.volumeCbm, 1)} m³
                            </span>
                          </td>
                          <td className='py-1 px-1.5 text-right font-mono text-muted-foreground whitespace-nowrap'>
                            {formatTimeOnlyVn(trip.confirmedAt)}
                          </td>
                          <td className='py-1 px-1.5 text-right whitespace-nowrap'>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandTrip(trip.tripKey);
                              }}
                              data-testid={`btn-toggle-trip-${trip.tripCode}`}
                              className='inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer'
                            >
                              {isExpanded ? (
                                <>
                                  Ẩn ({trip.orders.length}){' '}
                                  <IconChevronUp className='h-3 w-3' />
                                </>
                              ) : (
                                <>
                                  Xem ({trip.orders.length}){' '}
                                  <IconChevronDown className='h-3 w-3' />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Bảng kê các vận đơn bên trong mã TRIP */}
                        {isExpanded && (
                          <tr className='bg-slate-50/90 dark:bg-slate-900/70'>
                            <td colSpan={7} className='p-1.5'>
                              <div className='rounded border bg-white dark:bg-slate-950 p-1 overflow-x-auto'>
                                <table className='w-full border-collapse text-left'>
                                  <thead>
                                    <tr className='text-[10px] font-bold uppercase text-slate-500 border-b'>
                                      <th className='py-1 px-1.5'>STT</th>
                                      <th className='py-1 px-1.5'>Mã vận đơn</th>
                                      <th className='py-1 px-1.5'>
                                        Mô tả hàng hóa
                                      </th>
                                      <th className='py-1 px-1.5'>
                                        Hành trình (Kho đi → Kho đến)
                                      </th>
                                      <th className='py-1 px-1.5 text-right'>
                                        Kiện xác nhận / Tổng kiện
                                      </th>
                                      <th className='py-1 px-1.5 text-right'>
                                        Trọng lượng (kg)
                                      </th>
                                      <th className='py-1 px-1.5 text-right'>
                                        Thể tích (m³)
                                      </th>
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
                                          {ord.goodsDescription ||
                                            'Hàng vận chuyển'}
                                        </td>
                                        <td className='py-1 px-1.5'>
                                          {ord.originHub || '—'} →{' '}
                                          {ord.destinationHub ||
                                            ord.route ||
                                            '—'}
                                        </td>
                                        <td className='py-1 px-1.5 text-right font-mono font-bold'>
                                          {ord.quantity} /{' '}
                                          {ord.totalOrderQuantity} kiện
                                        </td>
                                        <td className='py-1 px-1.5 text-right font-mono'>
                                          {formatNumberVn(ord.weightKg, 1)} kg
                                        </td>
                                        <td className='py-1 px-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300'>
                                          {formatNumberVn(ord.volumeCbm, 1)} m³
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className='bg-slate-100/90 dark:bg-slate-900 border-t-2 font-mono text-[10px] font-extrabold'>
                  <tr>
                    <td colSpan={3} className='py-1.5 px-1.5 uppercase'>
                      TỔNG CỘNG {isInbound ? 'CHUYẾN NHẬP' : 'CHUYẾN XUẤT'} (
                      {tripsList.length} chuyến):
                    </td>
                    <td className='py-1.5 px-1.5 text-right whitespace-nowrap'>
                      {totalOrders} mã đơn ({totalPackages} kiện)
                    </td>
                    <td
                      className={`py-1.5 px-1.5 text-right whitespace-nowrap ${
                        isInbound
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {formatNumberVn(totalWeightKg, 1)} kg •{' '}
                      {formatNumberVn(totalCbm, 1)} m³
                    </td>
                    <td colSpan={2} className='py-1.5 px-1.5' />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
                  Tất cả ({daySummary?.totalTrips ?? 0} chuyến)
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
                  Chuyến nhập ({daySummary?.inboundTrips ?? 0})
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
                  Chuyến xuất ({daySummary?.outboundTrips ?? 0})
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

          {/* Dải 14 ngày chọn nhanh (Quick Day Strip): Xem nhanh mỗi ngày có bao nhiêu chuyến nhập / xuất & tổng sản lượng */}
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
                  <div className='flex items-center justify-between gap-1.5 text-[10px] font-mono font-bold'>
                    <span>{d.dayLabel}</span>
                    <span>({d.totalTrips} chuyến)</span>
                  </div>
                  <div
                    className={`text-[9px] font-mono ${
                      isSelected ? 'text-sky-100' : 'text-muted-foreground'
                    }`}
                  >
                    Nhập:{d.inboundTrips} • Xuất:{d.outboundTrips} |{' '}
                    {formatNumberVn(d.totalCbm, 1)} CBM
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. KHỐI TỔNG HỢP TRỰC QUAN TRONG NGÀY (NHÌN 1 CÁI THẤY NGAY SỐ CHUYẾN NHẬP, SỐ CHUYẾN XUẤT, CÁC MÃ TRIP & TỔNG SẢN LƯỢNG) */}
      <Card
        className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
        data-testid='daily-trips-glance-card'
      >
        <CardContent className='p-0 space-y-2'>
          {/* Banner tiêu đề ngày & khung giờ chốt */}
          <div
            className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 text-[10px]'
            data-testid='daily-trips-window-banner'
          >
            <div className='flex flex-wrap items-center gap-1.5'>
              <IconClock className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0' />
              <span className='font-extrabold uppercase text-[#0F3D62] dark:text-blue-300'>
                TỔNG HỢP NHANH NGÀY {data?.filter?.fullDateLabel || activeDate}:
              </span>
              <span className='font-mono font-bold text-blue-700 dark:text-blue-300'>
                Khung giờ chốt: {data?.filter?.windowLabel || '—'}
              </span>
              <span className='text-muted-foreground'>
                ({data?.filter?.hubName || 'Tất cả Chi nhánh'})
              </span>
            </div>
            <div>
              {data?.filter?.isCurrentOpen ? (
                <Badge className='bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 text-[10px] px-1.5 py-0'>
                  Kỳ đang mở (Chốt lúc 06:00)
                </Badge>
              ) : (
                <Badge className='bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 text-[10px] px-1.5 py-0'>
                  Đã chốt sổ 06:00
                </Badge>
              )}
            </div>
          </div>

          {/* 4 Thẻ KPI Tóm tắt 1 ánh nhìn */}
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2'>
            <div className='rounded border border-l-4 border-l-[#0F3D62] p-2 bg-slate-50/50 dark:bg-slate-900/40 space-y-0.5'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                  1. Tổng số chuyến trong ngày
                </span>
                <IconRoute className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
              </div>
              <div
                className='text-base font-extrabold font-mono text-[#0F3D62] dark:text-blue-300'
                data-testid='daily-kpi-total-trips'
              >
                {daySummary?.totalTrips ?? 0} chuyến xe (TRIP)
              </div>
              <div className='text-[10px] font-mono text-muted-foreground'>
                <strong className='text-blue-700 dark:text-blue-300'>
                  {daySummary?.inboundTrips ?? 0} chuyến nhập
                </strong>{' '}
                +{' '}
                <strong className='text-emerald-700 dark:text-emerald-300'>
                  {daySummary?.outboundTrips ?? 0} chuyến xuất
                </strong>{' '}
                •{' '}
                <strong className='text-foreground'>
                  {daySummary?.totalOrders ?? 0} mã đơn
                </strong>
              </div>
            </div>

            <div className='rounded border border-l-4 border-l-blue-600 p-2 bg-blue-50/30 dark:bg-blue-950/20 space-y-0.5'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300'>
                  2. Chuyến Nhập Kho &amp; Sản lượng
                </span>
                <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
              </div>
              <div
                className='text-base font-extrabold font-mono text-blue-700 dark:text-blue-300'
                data-testid='daily-kpi-inbound-trips'
              >
                {daySummary?.inboundTrips ?? 0} xe nhập kho
              </div>
              <div className='text-[10px] font-mono text-foreground font-semibold'>
                {daySummary?.inboundOrders ?? 0} mã đơn •{' '}
                {formatNumberVn(daySummary?.inboundWeightKg ?? 0, 1)} kg •{' '}
                {formatNumberVn(daySummary?.inboundCbm ?? 0, 1)} m³
              </div>
            </div>

            <div className='rounded border border-l-4 border-l-emerald-600 p-2 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-0.5'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300'>
                  3. Chuyến Xuất Kho &amp; Sản lượng
                </span>
                <IconTruck className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
              </div>
              <div
                className='text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-300'
                data-testid='daily-kpi-outbound-trips'
              >
                {daySummary?.outboundTrips ?? 0} xe xuất kho
              </div>
              <div className='text-[10px] font-mono text-foreground font-semibold'>
                {daySummary?.outboundOrders ?? 0} mã đơn •{' '}
                {formatNumberVn(daySummary?.outboundWeightKg ?? 0, 1)} kg •{' '}
                {formatNumberVn(daySummary?.outboundCbm ?? 0, 1)} m³
              </div>
            </div>

            <div className='rounded border border-l-4 border-l-purple-600 p-2 bg-purple-50/30 dark:bg-purple-950/20 space-y-0.5'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300'>
                  4. Tổng Sản Lượng Trong Ngày
                </span>
                <IconPackage className='h-3.5 w-3.5 text-purple-600 dark:text-purple-400' />
              </div>
              <div
                className='text-base font-extrabold font-mono text-purple-700 dark:text-purple-300'
                data-testid='daily-kpi-total-volume'
              >
                {formatNumberVn(daySummary?.totalWeightKg ?? 0, 1)} kg •{' '}
                {formatNumberVn(daySummary?.totalCbm ?? 0, 1)} m³
              </div>
              <div className='text-[10px] font-mono text-muted-foreground'>
                Tổng:{' '}
                <strong className='text-foreground'>
                  {daySummary?.totalOrders ?? 0} mã đơn
                </strong>{' '}
                •{' '}
                <strong className='text-foreground'>
                  {daySummary?.totalPackages ?? 0} kiện
                </strong>
              </div>
            </div>
          </div>

          {/* BẢNG TÓM TẮT 1 ÁNH NHÌN: SỐ CHUYẾN NHẬP / XUẤT + TẤT CẢ CÁC MÃ TRIP (SỐ LƯỢNG MÃ ĐƠN, KG, M³) + TỔNG SẢN LƯỢNG */}
          <div className='overflow-x-auto rounded border'>
            <table
              className='w-full border-collapse text-left'
              data-testid='daily-glance-summary-table'
            >
              <thead className='bg-slate-100 dark:bg-slate-900 border-b'>
                <tr className='text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300'>
                  <th className='py-1.5 px-2 w-44'>Phân loại chuyến xe</th>
                  <th className='py-1.5 px-2 w-32 text-right'>
                    Số lượng chuyến
                  </th>
                  <th className='py-1.5 px-2'>
                    Danh sách các Mã TRIP trong ngày{' '}
                    <span className='font-normal text-muted-foreground normal-case'>
                      (Mã TRIP: số lượng mã đơn • kg • m³ — bấm để xem đơn)
                    </span>
                  </th>
                  <th className='py-1.5 px-2 w-40 text-right'>
                    Số lượng Mã đơn
                  </th>
                  <th className='py-1.5 px-2 w-56 text-right'>
                    Tổng Sản Lượng (kg &amp; m³)
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60 text-[10px]'>
                {/* Dòng 1: Chuyến Nhập Kho */}
                <tr
                  className='bg-blue-50/25 dark:bg-blue-950/15'
                  data-testid='glance-row-inbound'
                >
                  <td className='py-1.5 px-2 font-extrabold text-blue-700 dark:text-blue-300'>
                    <div className='flex items-center gap-1.5'>
                      <IconBuildingWarehouse className='h-3.5 w-3.5 shrink-0' />
                      <span>CHUYẾN NHẬP KHO</span>
                    </div>
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-extrabold text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap'>
                    {daySummary?.inboundTrips ?? 0} chuyến nhập
                  </td>
                  <td
                    className='py-1.5 px-2'
                    data-testid='glance-inbound-trip-codes'
                  >
                    {allDayInboundTrips.length === 0 ? (
                      <span className='text-muted-foreground italic'>
                        Không có chuyến nhập kho trong ngày
                      </span>
                    ) : (
                      <div className='flex flex-wrap items-center gap-1'>
                        {allDayInboundTrips.map((t) => (
                          <button
                            key={t.tripKey}
                            type='button'
                            onClick={() => handleFocusAndExpandTrip(t)}
                            title={`${t.tripCode} • ${t.hubName} • ${t.licensePlate || '—'} • ${t.orderCount} mã đơn • ${formatNumberVn(t.weightKg, 1)} kg • ${formatNumberVn(t.volumeCbm, 1)} m³`}
                            className='inline-flex items-center gap-1 rounded border border-blue-300 dark:border-blue-800 bg-blue-100/80 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-900 dark:text-blue-200 cursor-pointer transition-colors'
                          >
                            <span>{t.tripCode}</span>
                            <span className='text-[9px] font-normal text-blue-700 dark:text-blue-300'>
                              ({t.orderCount} mã đơn •{' '}
                              {formatNumberVn(t.weightKg, 1)} kg •{' '}
                              {formatNumberVn(t.volumeCbm, 1)} m³)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-semibold whitespace-nowrap'>
                    <span className='font-extrabold text-foreground'>
                      {daySummary?.inboundOrders ?? 0} mã đơn
                    </span>{' '}
                    <span className='text-muted-foreground'>
                      ({daySummary?.inboundPackages ?? 0} kiện)
                    </span>
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-extrabold text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap'>
                    {formatNumberVn(daySummary?.inboundWeightKg ?? 0, 1)} kg •{' '}
                    {formatNumberVn(daySummary?.inboundCbm ?? 0, 1)} m³
                  </td>
                </tr>

                {/* Dòng 2: Chuyến Xuất Kho */}
                <tr
                  className='bg-emerald-50/25 dark:bg-emerald-950/15'
                  data-testid='glance-row-outbound'
                >
                  <td className='py-1.5 px-2 font-extrabold text-emerald-700 dark:text-emerald-300'>
                    <div className='flex items-center gap-1.5'>
                      <IconTruck className='h-3.5 w-3.5 shrink-0' />
                      <span>CHUYẾN XUẤT KHO</span>
                    </div>
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-extrabold text-xs text-emerald-700 dark:text-emerald-300 whitespace-nowrap'>
                    {daySummary?.outboundTrips ?? 0} chuyến xuất
                  </td>
                  <td
                    className='py-1.5 px-2'
                    data-testid='glance-outbound-trip-codes'
                  >
                    {allDayOutboundTrips.length === 0 ? (
                      <span className='text-muted-foreground italic'>
                        Không có chuyến xuất kho trong ngày
                      </span>
                    ) : (
                      <div className='flex flex-wrap items-center gap-1'>
                        {allDayOutboundTrips.map((t) => (
                          <button
                            key={t.tripKey}
                            type='button'
                            onClick={() => handleFocusAndExpandTrip(t)}
                            title={`${t.tripCode} • ${t.hubName} • ${t.licensePlate || '—'} • ${t.orderCount} mã đơn • ${formatNumberVn(t.weightKg, 1)} kg • ${formatNumberVn(t.volumeCbm, 1)} m³`}
                            className='inline-flex items-center gap-1 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-100/80 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer transition-colors'
                          >
                            <span>{t.tripCode}</span>
                            <span className='text-[9px] font-normal text-emerald-700 dark:text-emerald-300'>
                              ({t.orderCount} mã đơn •{' '}
                              {formatNumberVn(t.weightKg, 1)} kg •{' '}
                              {formatNumberVn(t.volumeCbm, 1)} m³)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-semibold whitespace-nowrap'>
                    <span className='font-extrabold text-foreground'>
                      {daySummary?.outboundOrders ?? 0} mã đơn
                    </span>{' '}
                    <span className='text-muted-foreground'>
                      ({daySummary?.outboundPackages ?? 0} kiện)
                    </span>
                  </td>
                  <td className='py-1.5 px-2 text-right font-mono font-extrabold text-xs text-emerald-700 dark:text-emerald-300 whitespace-nowrap'>
                    {formatNumberVn(daySummary?.outboundWeightKg ?? 0, 1)} kg •{' '}
                    {formatNumberVn(daySummary?.outboundCbm ?? 0, 1)} m³
                  </td>
                </tr>
              </tbody>
              {/* Dòng 3: TỔNG CỘNG TRONG NGÀY */}
              <tfoot className='bg-[#0F3D62] text-white font-mono text-[11px] font-extrabold'>
                <tr data-testid='glance-row-total'>
                  <td className='py-1.5 px-2 uppercase'>
                    TỔNG CỘNG NGÀY {data?.filter?.fullDateLabel || activeDate}
                  </td>
                  <td className='py-1.5 px-2 text-right whitespace-nowrap'>
                    {daySummary?.totalTrips ?? 0} chuyến (
                    {daySummary?.inboundTrips ?? 0}N /{' '}
                    {daySummary?.outboundTrips ?? 0}X)
                  </td>
                  <td className='py-1.5 px-2 text-sky-100 font-sans text-[10px] font-semibold'>
                    {`Tổng cộng ${daySummary?.inboundTrips ?? 0} mã TRIP Nhập kho & ${daySummary?.outboundTrips ?? 0} mã TRIP Xuất kho đã xác nhận`}
                  </td>
                  <td className='py-1.5 px-2 text-right whitespace-nowrap'>
                    {daySummary?.totalOrders ?? 0} mã đơn (
                    {daySummary?.totalPackages ?? 0} kiện)
                  </td>
                  <td className='py-1.5 px-2 text-right text-amber-300 whitespace-nowrap'>
                    {formatNumberVn(daySummary?.totalWeightKg ?? 0, 1)} kg •{' '}
                    {formatNumberVn(daySummary?.totalCbm ?? 0, 1)} m³
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. DANH SÁCH CHI TIẾT MÃ TRIP TRONG NGÀY — TÁCH RÕ 2 BẢNG SONG SONG (BẢNG CHUYẾN NHẬP KHO vs BẢNG CHUYẾN XUẤT KHO) */}
      <div
        className='space-y-1.5'
        data-testid='daily-trips-detail-card'
      >
        {isLoading ? (
          <Card className='p-2 border-slate-200 dark:border-slate-800'>
            <CardContent className='p-0'>
              <div className='flex items-center justify-center py-8 text-xs text-muted-foreground gap-1.5'>
                <IconLoader2 className='h-4 w-4 animate-spin' />
                <span>Đang tải danh sách mã TRIP trong ngày...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              direction === 'ALL'
                ? 'grid grid-cols-1 xl:grid-cols-2 gap-2'
                : 'grid grid-cols-1 gap-2'
            }
            data-testid='daily-trips-list'
          >
            {(direction === 'ALL' || direction === 'INBOUND') &&
              renderTripSectionTable(
                '1. DANH SÁCH CHUYẾN NHẬP KHO',
                'INBOUND',
                inboundFilteredTrips,
                inboundFilteredTrips.reduce((s, t) => s + t.volumeCbm, 0),
                Math.round(
                  inboundFilteredTrips.reduce((s, t) => s + t.weightKg, 0) * 100
                ) / 100,
                inboundFilteredTrips.reduce((s, t) => s + t.packageCount, 0),
                inboundFilteredTrips.reduce((s, t) => s + t.orderCount, 0)
              )}

            {(direction === 'ALL' || direction === 'OUTBOUND') &&
              renderTripSectionTable(
                '2. DANH SÁCH CHUYẾN XUẤT KHO',
                'OUTBOUND',
                outboundFilteredTrips,
                outboundFilteredTrips.reduce((s, t) => s + t.volumeCbm, 0),
                Math.round(
                  outboundFilteredTrips.reduce((s, t) => s + t.weightKg, 0) *
                    100
                ) / 100,
                outboundFilteredTrips.reduce((s, t) => s + t.packageCount, 0),
                outboundFilteredTrips.reduce((s, t) => s + t.orderCount, 0)
              )}
          </div>
        )}
      </div>

      {/* 4. BẢNG TỔNG HỢP THEO TỪNG NGÀY (14 NGÀY GẦN NHẤT): NHÌN 1 CÁI BIẾT MỖI NGÀY CÓ BAO NHIÊU CHUYẾN NHẬP, CHUYẾN XUẤT, CÁC MÃ TRIP & TỔNG SẢN LƯỢNG */}
      <Card
        className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
        data-testid='daily-trips-by-date-summary-card'
      >
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1'>
            <span className='text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200'>
              BẢNG TỔNG HỢP CHUYẾN NHẬP / CHUYẾN XUẤT, MÃ TRIP &amp; SẢN LƯỢNG
              THEO TỪNG NGÀY (14 NGÀY GẦN NHẤT)
            </span>
            <span className='text-[10px] text-muted-foreground'>
              Bấm vào dòng ngày bất kỳ để xem chi tiết toàn bộ chuyến xe &amp;
              vận đơn của ngày đó
            </span>
          </div>
          <div className='max-h-72 overflow-auto rounded border'>
            <table
              className='w-full border-collapse text-left'
              data-testid='daily-trips-by-date-summary-table'
            >
              <thead className='sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10'>
                <tr className='text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300'>
                  <th className='py-1 px-1.5 w-28'>Ngày báo cáo</th>
                  <th className='py-1 px-1.5 w-52 text-right'>
                    Chuyến Nhập (Mã đơn • kg • m³)
                  </th>
                  <th className='py-1 px-1.5'>Các Mã TRIP Nhập trong ngày</th>
                  <th className='py-1 px-1.5 w-52 text-right'>
                    Chuyến Xuất (Mã đơn • kg • m³)
                  </th>
                  <th className='py-1 px-1.5'>Các Mã TRIP Xuất trong ngày</th>
                  <th className='py-1 px-1.5 w-56 text-right'>
                    Tổng Ngày (Mã đơn • kg • m³)
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60 text-[10px]'>
                {recentDaysStrip.toReversed().map((d) => {
                  const isSelected = d.reportDate === activeDate;
                  const inCodes = d.inboundTripCodes ?? [];
                  const outCodes = d.outboundTripCodes ?? [];
                  return (
                    <tr
                      key={d.reportDate}
                      onClick={() => setReportDate(d.reportDate)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-l-[#0F3D62]'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <td className='py-1 px-1.5 font-mono font-bold whitespace-nowrap'>
                        <div className='text-[11px] text-[#0F3D62] dark:text-blue-300'>
                          {d.fullDateLabel}
                        </div>
                        <div className='text-[9px] text-muted-foreground font-normal'>
                          06:00 D → 05:59 D+1
                        </div>
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono whitespace-nowrap'>
                        <div className='font-extrabold text-blue-700 dark:text-blue-300'>
                          {d.inboundTrips} chuyến nhập •{' '}
                          {d.inboundOrders ?? 0} mã đơn
                        </div>
                        <div className='text-[9px] text-muted-foreground'>
                          {formatNumberVn(d.inboundWeightKg ?? 0, 1)} kg •{' '}
                          {formatNumberVn(d.inboundCbm, 1)} m³
                        </div>
                      </td>
                      <td className='py-1 px-1.5'>
                        {inCodes.length === 0 ? (
                          <span className='text-muted-foreground'>—</span>
                        ) : (
                          <div className='flex flex-wrap gap-1'>
                            {inCodes.slice(0, 8).map((code) => (
                              <span
                                key={code}
                                className='rounded bg-blue-100/80 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-1 py-0 font-mono text-[9px] font-bold text-blue-800 dark:text-blue-200'
                              >
                                {code}
                              </span>
                            ))}
                            {inCodes.length > 8 && (
                              <span className='rounded bg-blue-600 text-white px-1 py-0 font-mono text-[9px] font-bold'>
                                +{inCodes.length - 8} TRIP
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono whitespace-nowrap'>
                        <div className='font-extrabold text-emerald-700 dark:text-emerald-300'>
                          {d.outboundTrips} chuyến xuất •{' '}
                          {d.outboundOrders ?? 0} mã đơn
                        </div>
                        <div className='text-[9px] text-muted-foreground'>
                          {formatNumberVn(d.outboundWeightKg ?? 0, 1)} kg •{' '}
                          {formatNumberVn(d.outboundCbm, 1)} m³
                        </div>
                      </td>
                      <td className='py-1 px-1.5'>
                        {outCodes.length === 0 ? (
                          <span className='text-muted-foreground'>—</span>
                        ) : (
                          <div className='flex flex-wrap gap-1'>
                            {outCodes.slice(0, 8).map((code) => (
                              <span
                                key={code}
                                className='rounded bg-emerald-100/80 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 px-1 py-0 font-mono text-[9px] font-bold text-emerald-800 dark:text-emerald-200'
                              >
                                {code}
                              </span>
                            ))}
                            {outCodes.length > 8 && (
                              <span className='rounded bg-emerald-600 text-white px-1 py-0 font-mono text-[9px] font-bold'>
                                +{outCodes.length - 8} TRIP
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono whitespace-nowrap'>
                        <div className='font-extrabold text-[#0F3D62] dark:text-blue-300'>
                          {d.totalTrips} chuyến • {d.totalOrders ?? 0} mã đơn
                        </div>
                        <div className='font-bold text-purple-700 dark:text-purple-300'>
                          {formatNumberVn(d.totalWeightKg ?? 0, 1)} kg •{' '}
                          {formatNumberVn(d.totalCbm, 1)} m³
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Khung Cảnh báo Chuyến xe Chưa xác nhận / Đang nháp trước giờ Cut-off 06:00 */}
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
                Kiểm soát Chuyến xe Chưa xác nhận trước giờ Cut-off 06:00
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
                ? 'Cần xác nhận Nhập/Xuất kho trước 06:00 để được ghi nhận vào sản lượng chốt ngày'
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
    </div>
  );
}
