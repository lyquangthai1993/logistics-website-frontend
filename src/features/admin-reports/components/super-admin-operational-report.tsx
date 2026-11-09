'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  IconBuildingWarehouse,
  IconCalendar,
  IconClock,
  IconFileTypeXls,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconRoute,
  IconTrendingUp,
  IconTruck,
  IconArrowDownLeft,
  IconArrowUpRight
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WarehouseHubFilterSelect } from '@/features/warehouse/components/warehouse-hub-filter-select';

export type ReportDirection = 'INBOUND' | 'OUTBOUND' | 'ALL';

export interface DirectionMetrics {
  cbm: number;
  weightTons: number;
  weightKg: number;
  tripCount: number;
  orderCount: number;
  packageCount: number;
}

export interface DailyReportPoint extends DirectionMetrics {
  reportDate: string;
  dayOfMonth: number;
  dayLabel: string;
  fullDateLabel: string;
  windowStart: string;
  windowEnd: string;
  windowLabel: string;
  isClosed: boolean;
  isFuture: boolean;
  triggeredBy: string;
  inbound: DirectionMetrics;
  outbound: DirectionMetrics;
}

export interface MonthlyReportPoint extends DirectionMetrics {
  monthKey: string;
  year: number;
  month: number;
  monthLabel: string;
  inbound: DirectionMetrics;
  outbound: DirectionMetrics;
}

export interface HubBreakdownPoint extends DirectionMetrics {
  hubId: number;
  code: string | null;
  name: string;
  city: string | null;
  level: number;
  inbound: DirectionMetrics;
  outbound: DirectionMetrics;
}

export interface ConfirmedTripReportItem {
  tripCode: string;
  invoiceCode: string | null;
  reportDate: string;
  windowLabel: string;
  confirmedAt: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
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
}

export interface OperationalReportResponse {
  filter: {
    fromDate: string;
    toDate: string;
    hubId: number | 'ALL';
    hubName: string;
    hubCode: string;
    hubLevel: number | null;
    direction: ReportDirection;
    cutoffRule: string;
    cronSchedule: string;
    lastClosedReportDate: string;
    lastCronRunAt: string | null;
  };
  summary: DirectionMetrics & {
    averageCbmPerDay: number;
    averageTonsPerDay: number;
    totalDaysInRange: number;
    effectiveDaysCount: number;
    activeDaysCount: number;
    inbound: DirectionMetrics & {
      averageCbmPerDay: number;
      averageTonsPerDay: number;
    };
    outbound: DirectionMetrics & {
      averageCbmPerDay: number;
      averageTonsPerDay: number;
    };
  };
  dailySeries: DailyReportPoint[];
  monthlySeries: MonthlyReportPoint[];
  hubBreakdown: HubBreakdownPoint[];
  confirmedTrips: ConfirmedTripReportItem[];
}

function getDefaultMonthRange(): { fromDate: string; toDate: string } {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const qFrom = sp.get('fromDate') || '';
    const qTo = sp.get('toDate') || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(qFrom) && /^\d{4}-\d{2}-\d{2}$/.test(qTo)) {
      return { fromDate: qFrom, toDate: qTo };
    }
  }
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const iso = vnNow.toISOString();
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { fromDate, toDate: lastDay };
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

interface CalloutLabelProps {
  x?: number | string;
  y?: number | string;
  value?: number | string | boolean | null;
}

/** Custom boxed label for Slide 3 Top Chart (SỐ KHỐI) */
function renderMonthlyCbmCallout(props: CalloutLabelProps) {
  const { x, y, value } = props;
  if (
    x === undefined ||
    y === undefined ||
    value === undefined ||
    value === null
  )
    return null;
  const numX = Number(x);
  const numY = Number(y);
  const text = formatNumberVn(Math.round(Number(value) * 10) / 10, 1);
  const width = Math.max(38, text.length * 7 + 10);
  return (
    <g>
      <rect
        x={numX - width / 2}
        y={numY - 26}
        width={width}
        height={18}
        rx={2}
        fill='#F8FAFC'
        stroke='#CBD5E1'
        strokeWidth={1}
      />
      <text
        x={numX}
        y={numY - 13}
        textAnchor='middle'
        fill='#0F172A'
        fontSize={10}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

/** Custom label for Slide 3 Bottom Chart (SỐ TẤN on dark #0F5C7E background) */
function renderMonthlyTonsCallout(props: CalloutLabelProps) {
  const { x, y, value } = props;
  if (
    x === undefined ||
    y === undefined ||
    value === undefined ||
    value === null
  )
    return null;
  const numX = Number(x);
  const numY = Number(y);
  const text = formatNumberVn(Math.round(Number(value) * 100) / 100, 2);
  return (
    <g>
      <text
        x={numX}
        y={numY - 10}
        textAnchor='middle'
        fill='#FFFFFF'
        fontSize={10}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

interface AdminOperationalReportContextValue {
  fromDate: string;
  setFromDate: React.Dispatch<React.SetStateAction<string>>;
  toDate: string;
  setToDate: React.Dispatch<React.SetStateAction<string>>;
  selectedHubId: string;
  setSelectedHubId: React.Dispatch<React.SetStateAction<string>>;
  direction: ReportDirection;
  setDirection: React.Dispatch<React.SetStateAction<ReportDirection>>;
  activeTab: 'daily' | 'trips' | 'hubs';
  setActiveTab: React.Dispatch<React.SetStateAction<'daily' | 'trips' | 'hubs'>>;
  data: OperationalReportResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  syncIsPending: boolean;
  triggerSync: () => void;
  applyQuickRange: (
    preset: 'THIS_MONTH' | 'LAST_MONTH' | 'OCT_2026' | 'LAST_7' | 'LAST_30'
  ) => void;
  handleExportExcel: () => void;
  directionLabel: string;
  dailySeries: DailyReportPoint[];
  monthlySeries: MonthlyReportPoint[];
  hubBreakdown: HubBreakdownPoint[];
  confirmedTrips: ConfirmedTripReportItem[];
  summary: OperationalReportResponse['summary'] | undefined;
}

const AdminOperationalReportContext =
  createContext<AdminOperationalReportContextValue | null>(null);

export function useAdminOperationalReport(): AdminOperationalReportContextValue {
  const ctx = useContext(AdminOperationalReportContext);
  if (!ctx) {
    throw new Error(
      'useAdminOperationalReport must be used within AdminOperationalReportProvider'
    );
  }
  return ctx;
}

/**
 * Shared Context Provider for Next.js Parallel Routes in `/dashboard/admin/reports/layout.tsx`.
 * Single Global Filter state (`fromDate`, `toDate`, `selectedHubId`, `direction`) controls
 * all parallel route slots (`@daily_stats`, `@monthly_trends`, `@drilldown_table`) simultaneously.
 */
export function AdminOperationalReportProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const defaultRange = useMemo(() => getDefaultMonthRange(), []);

  const [fromDate, setFromDate] = useState<string>(defaultRange.fromDate);
  const [toDate, setToDate] = useState<string>(defaultRange.toDate);
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [direction, setDirection] = useState<ReportDirection>('INBOUND');
  const [activeTab, setActiveTab] = useState<'daily' | 'trips' | 'hubs'>(
    'daily'
  );

  const { data, isLoading, isFetching } = useQuery<OperationalReportResponse>({
    queryKey: [
      'admin-operational-report',
      fromDate,
      toDate,
      selectedHubId,
      direction
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        fromDate,
        toDate,
        direction,
        monthsCount: 5
      };
      if (selectedHubId && selectedHubId !== 'ALL') {
        params.hubId = selectedHubId;
      }
      const res = await apiClient.get<
        OperationalReportResponse | { data: OperationalReportResponse }
      >('/api/v1/admin/reports/operational', { params });
      const raw = res.data as { data?: OperationalReportResponse } &
        OperationalReportResponse;
      return raw?.data ?? raw;
    },
    staleTime: 30 * 1000
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{
        processedDays?: number;
        upsertedRows?: number;
        data?: { processedDays?: number; upsertedRows?: number };
      }>('/api/v1/admin/reports/operational/sync', {
        fromDate,
        toDate,
        notifySuperAdmins: true
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (res) => {
      toast.success(
        `Đã đồng bộ báo cáo vận hành (${res?.processedDays ?? 0} ngày, khung 06:00 D → 05:59 D+1)`
      );
      void queryClient.invalidateQueries({
        queryKey: ['admin-operational-report']
      });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      toast.error(formatApiError(err, 'Không thể đồng bộ báo cáo vận hành'));
    }
  });

  const applyQuickRange = (
    preset: 'THIS_MONTH' | 'LAST_MONTH' | 'OCT_2026' | 'LAST_7' | 'LAST_30'
  ) => {
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const iso = vnNow.toISOString();
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const todayStr = iso.slice(0, 10);

    if (preset === 'THIS_MONTH') {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(year, month, 0))
        .toISOString()
        .slice(0, 10);
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'LAST_MONTH') {
      const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
      const py = prevMonthDate.getUTCFullYear();
      const pm = prevMonthDate.getUTCMonth() + 1;
      const start = `${py}-${String(pm).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(py, pm, 0)).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'OCT_2026') {
      setFromDate('2026-10-01');
      setToDate('2026-10-31');
    } else if (preset === 'LAST_7') {
      const d = new Date(`${todayStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 6);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === 'LAST_30') {
      const d = new Date(`${todayStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 29);
      setFromDate(d.toISOString().slice(0, 10));
      setToDate(todayStr);
    }
  };

  const dailySeries = data?.dailySeries ?? [];
  const monthlySeries = data?.monthlySeries ?? [];
  const hubBreakdown = data?.hubBreakdown ?? [];
  const confirmedTrips = useMemo(
    () => data?.confirmedTrips ?? [],
    [data?.confirmedTrips]
  );
  const summary = data?.summary;

  const handleExportExcel = () => {
    if (!data) {
      toast.error('Chưa có dữ liệu báo cáo để xuất Excel');
      return;
    }

    const wb = XLSX.utils.book_new();

    const dailyRows = dailySeries.map((d, idx) => ({
      STT: idx + 1,
      'Ngày báo cáo': d.fullDateLabel,
      'Khung giờ chốt (06:00 D → 05:59 D+1)': d.windowLabel,
      'Trạng thái kỳ': d.isFuture
        ? 'Chưa diễn ra'
        : d.isClosed
          ? 'Đã chốt sổ'
          : 'Đang ghi nhận',
      'Sản lượng chọn (CBM)': d.cbm,
      'Trọng lượng chọn (Tấn)': d.weightTons,
      'Trọng lượng chọn (Kg)': d.weightKg,
      'Số chuyến xác nhận': d.tripCount,
      'Số kiện xác nhận': d.packageCount,
      'Nhập kho (CBM)': d.inbound.cbm,
      'Nhập kho (Tấn)': d.inbound.weightTons,
      'Nhập kho (Chuyến)': d.inbound.tripCount,
      'Xuất kho (CBM)': d.outbound.cbm,
      'Xuất kho (Tấn)': d.outbound.weightTons,
      'Xuất kho (Chuyến)': d.outbound.tripCount
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'SanLuongTheoNgay_Slide2');

    const monthlyRows = monthlySeries.map((m, idx) => ({
      STT: idx + 1,
      Tháng: m.monthLabel,
      'Mã tháng': m.monthKey,
      'Số Khối (CBM)': m.cbm,
      'Số Tấn': m.weightTons,
      'Trọng lượng (Kg)': m.weightKg,
      'Số chuyến xác nhận': m.tripCount,
      'Số kiện xác nhận': m.packageCount,
      'Nhập kho (CBM)': m.inbound.cbm,
      'Nhập kho (Tấn)': m.inbound.weightTons,
      'Xuất kho (CBM)': m.outbound.cbm,
      'Xuất kho (Tấn)': m.outbound.weightTons
    }));
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'XuHuongThang_Slide3');

    const hubRows = hubBreakdown.map((h, idx) => ({
      STT: idx + 1,
      'Mã Kho': h.code || '—',
      'Tên Chi Nhánh Kho': h.name,
      'Phân cấp Hub': h.level > 1 ? 'Cấp 2 • Trạm Xe Bo' : 'Cấp 1 • Hub Chính',
      'Tỉnh / Thành phố': h.city || '—',
      'Sản lượng (CBM)': h.cbm,
      'Trọng lượng (Tấn)': h.weightTons,
      'Số chuyến xác nhận': h.tripCount,
      'Số kiện xác nhận': h.packageCount,
      'Nhập kho (CBM)': h.inbound.cbm,
      'Nhập kho (Tấn)': h.inbound.weightTons,
      'Xuất kho (CBM)': h.outbound.cbm,
      'Xuất kho (Tấn)': h.outbound.weightTons
    }));
    const wsHubs = XLSX.utils.json_to_sheet(hubRows);
    XLSX.utils.book_append_sheet(wb, wsHubs, 'TheoChiNhanhKho');

    const tripRows = confirmedTrips.map((t, idx) => ({
      STT: idx + 1,
      'Mã chuyến xe': t.tripCode,
      'Mã phiếu kho': t.invoiceCode || '—',
      'Chiều vận hành':
        t.direction === 'INBOUND'
          ? 'Xe nhập kho'
          : t.direction === 'TRANSFER'
            ? 'Trung chuyển liên Hub'
            : 'Xe xuất kho',
      'Thời điểm xác nhận': formatDateTimeVn(t.confirmedAt),
      'Thuộc ngày báo cáo': t.reportDate,
      'Khung giờ báo cáo': t.windowLabel,
      'Chi nhánh Kho': t.hubName,
      'Phân cấp Hub':
        t.hubLevel > 1 ? 'Cấp 2 • Trạm Xe Bo' : 'Cấp 1 • Hub Chính',
      'Biển số xe': t.licensePlate || '—',
      'Tài xế': t.driverName || '—',
      'Số đơn': t.orderCount,
      'Số kiện': t.packageCount,
      'Số Khối (CBM)': t.volumeCbm,
      'Số Tấn': t.weightTons,
      'Trọng lượng (Kg)': t.weightKg
    }));
    const wsTrips = XLSX.utils.json_to_sheet(tripRows);
    XLSX.utils.book_append_sheet(wb, wsTrips, 'ChuyenXeXacNhan');

    const fileName = `BaoCaoVanHanh_SuperAdmin_${fromDate}_den_${toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Đã xuất tệp Excel: ${fileName}`);
  };

  const directionLabel =
    direction === 'INBOUND'
      ? 'Chiều Nhập kho (Xe nhập xác nhận)'
      : direction === 'OUTBOUND'
        ? 'Chiều Xuất kho (Xe xuất xác nhận)'
        : 'Tổng lưu thông (Nhập kho + Xuất kho)';

  const ctxValue: AdminOperationalReportContextValue = {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedHubId,
    setSelectedHubId,
    direction,
    setDirection,
    activeTab,
    setActiveTab,
    data,
    isLoading,
    isFetching,
    syncIsPending: syncMutation.isPending,
    triggerSync: () => syncMutation.mutate(),
    applyQuickRange,
    handleExportExcel,
    directionLabel,
    dailySeries,
    monthlySeries,
    hubBreakdown,
    confirmedTrips,
    summary
  };

  return (
    <AdminOperationalReportContext.Provider value={ctxValue}>
      <div className='space-y-2' data-testid='super-admin-operational-report'>
        {children}
      </div>
    </AdminOperationalReportContext.Provider>
  );
}

/**
 * Primary slot (`page.tsx`):
 * Renders the SINGLE Unified Global Filter Bar (`global-report-filter-bar`) + 4 KPI Summary Cards.
 */
export function AdminReportHeaderAndKpis() {
  const {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedHubId,
    setSelectedHubId,
    direction,
    setDirection,
    data,
    isLoading,
    isFetching,
    syncIsPending,
    triggerSync,
    applyQuickRange,
    handleExportExcel,
    summary
  } = useAdminOperationalReport();

  return (
    <div className='space-y-2'>
      {/* 1. BỘ LỌC CHUNG GLOBAL DUY NHẤT TRÊN CÙNG (Single Unified Global Filter Bar) */}
      <Card
        className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
        data-testid='global-report-filter-bar'
      >
        <CardContent className='p-0 space-y-1.5'>
          <div className='flex flex-wrap items-center justify-between gap-1.5'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <div className='inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 h-8'>
                <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400 shrink-0' />
                <span className='text-[10px] font-semibold text-muted-foreground'>
                  Từ ngày
                </span>
                <input
                  type='date'
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  data-testid='report-from-date-input'
                  className='text-xs font-mono font-bold bg-transparent outline-none text-foreground cursor-pointer'
                />
                <span className='text-[10px] font-semibold text-muted-foreground'>
                  đến
                </span>
                <input
                  type='date'
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  data-testid='report-to-date-input'
                  className='text-xs font-mono font-bold bg-transparent outline-none text-foreground cursor-pointer'
                />
              </div>

              <div className='inline-flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => applyQuickRange('THIS_MONTH')}
                  data-testid='preset-this-month'
                  className='h-8 px-2 text-[10px] font-semibold cursor-pointer'
                >
                  Tháng này
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => applyQuickRange('LAST_MONTH')}
                  data-testid='preset-last-month'
                  className='h-8 px-2 text-[10px] font-semibold cursor-pointer'
                >
                  Tháng trước
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => applyQuickRange('LAST_7')}
                  data-testid='preset-last-7-days'
                  className='h-8 px-2 text-[10px] font-semibold cursor-pointer'
                >
                  7 ngày
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => applyQuickRange('LAST_30')}
                  data-testid='preset-last-30-days'
                  className='h-8 px-2 text-[10px] font-semibold cursor-pointer'
                >
                  30 ngày
                </Button>
              </div>

              <WarehouseHubFilterSelect
                value={selectedHubId}
                onChange={(val) => setSelectedHubId(val)}
              />

              <div
                className='inline-flex items-center gap-1.5 p-0.5'
                data-testid='report-direction-toggle'
              >
                <button
                  type='button'
                  onClick={() => setDirection('INBOUND')}
                  data-testid='direction-inbound-btn'
                  className={`h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                    direction === 'INBOUND'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/30'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  <IconArrowDownLeft className='h-3.5 w-3.5' />
                  <span>Báo cáo Nhập kho</span>
                </button>
                <button
                  type='button'
                  onClick={() => setDirection('OUTBOUND')}
                  data-testid='direction-outbound-btn'
                  className={`h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                    direction === 'OUTBOUND'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/30'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  <IconArrowUpRight className='h-3.5 w-3.5' />
                  <span>Báo cáo Xuất kho</span>
                </button>
              </div>
            </div>

            <div className='flex items-center gap-1.5'>
              <Link
                href={
                  selectedHubId && selectedHubId !== 'ALL'
                    ? `/dashboard/admin/reports/trips?hubId=${selectedHubId}`
                    : '/dashboard/admin/reports/trips'
                }
              >
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  data-testid='report-goto-daily-trips-btn'
                  className='h-8 px-2.5 text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer'
                >
                  <IconRoute className='h-3.5 w-3.5 mr-1' />
                  Theo dõi TRIP theo ngày
                </Button>
              </Link>

              <Link href={`/dashboard/admin/cronjobs/DAILY_HUB_OPERATIONAL_REPORT?fromDate=${fromDate}&toDate=${toDate}`}>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  data-testid='report-goto-cronjobs-btn'
                  className='h-8 px-2.5 text-xs font-semibold border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer'
                >
                  <IconClock className='h-3.5 w-3.5 mr-1' />
                  Quản trị Cronjob
                </Button>
              </Link>

              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={syncIsPending || isFetching}
                onClick={triggerSync}
                data-testid='report-sync-cron-btn'
                className='h-8 px-2.5 text-xs font-semibold border-blue-300 dark:border-blue-800 text-[#0F3D62] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer'
              >
                {syncIsPending ? (
                  <IconLoader2 className='h-3.5 w-3.5 animate-spin mr-1' />
                ) : (
                  <IconRefresh className='h-3.5 w-3.5 mr-1' />
                )}
                Đồng bộ báo cáo
              </Button>

              <Button
                type='button'
                variant='default'
                size='sm'
                onClick={handleExportExcel}
                disabled={!data || isLoading}
                data-testid='report-export-excel-btn'
                className='h-8 px-2.5 text-xs font-semibold bg-[#0F3D62] hover:bg-[#0c314f] text-white cursor-pointer'
              >
                <IconFileTypeXls className='h-3.5 w-3.5 mr-1' />
                Xuất Excel
              </Button>
            </div>
          </div>

          <div
            className='flex flex-wrap items-center justify-between gap-1.5 rounded border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 px-2 py-1 text-[10px]'
            data-testid='cron-cutoff-rule-banner'
          >
            <div className='flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-200'>
              <IconClock className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0' />
              <span className='font-bold text-[#0F3D62] dark:text-blue-300'>
                Quy chuẩn chốt sổ Cronjob hàng ngày:
              </span>
              <span>
                Báo cáo ngày <strong className='font-mono'>D</strong> tổng hợp
                từ{' '}
                <strong className='font-mono text-blue-700 dark:text-blue-300'>
                  06:00 (6:00 AM) ngày D đến 05:59 (5:59 AM) ngày D+1
                </strong>{' '}
                (VD: ngày 09/11/2026 tính từ 06:00 09/11/2026 đến 05:59 10/11/2026).
              </span>
              <span className='text-muted-foreground'>
                • Thời gian chuyến xe tính theo lúc{' '}
                <strong>Xác nhận Nhập/Xuất chuyến xe</strong> (loại trừ chuyến
                nháp).
              </span>
            </div>
            <div className='flex items-center gap-1.5 shrink-0'>
              <Badge
                variant='outline'
                className='text-[10px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 font-mono'
              >
                Cron tự động:{' '}
                {data?.filter.cronSchedule || '06:05 hàng ngày (GMT+7)'}
              </Badge>
              {data?.filter.lastClosedReportDate && (
                <Badge
                  variant='outline'
                  className='text-[10px] px-1.5 py-0 h-4 bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300 font-mono'
                >
                  Kỳ chốt gần nhất: {data.filter.lastClosedReportDate}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Dải 4 thẻ KPI Tóm tắt Sản lượng */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'>
        <Card className='p-2 border-l-4 border-l-[#0F3D62] shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Tổng sản lượng khối (CBM)
              </span>
              <IconTrendingUp className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-[#0F3D62] dark:text-blue-300'
              data-testid='kpi-total-cbm'
            >
              {formatNumberVn(summary?.cbm ?? 0, 1)} CBM
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span>
                Trung bình:{' '}
                <strong className='font-mono text-foreground'>
                  {formatNumberVn(summary?.averageCbmPerDay ?? 0, 1)} CBM/ngày
                </strong>
              </span>
              <span className='font-mono'>
                Nhập {formatNumberVn(summary?.inbound.cbm ?? 0, 1)} • Xuất{' '}
                {formatNumberVn(summary?.outbound.cbm ?? 0, 1)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2 border-l-4 border-l-sky-600 shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Tổng sản lượng tấn (Số Tấn)
              </span>
              <IconTruck className='h-3.5 w-3.5 text-sky-600 dark:text-sky-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-sky-700 dark:text-sky-300'
              data-testid='kpi-total-tons'
            >
              {formatNumberVn(summary?.weightTons ?? 0, 2)} Tấn
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span>
                Trung bình:{' '}
                <strong className='font-mono text-foreground'>
                  {formatNumberVn(summary?.averageTonsPerDay ?? 0, 2)} Tấn/ngày
                </strong>
              </span>
              <span className='font-mono'>
                ({formatNumberVn(summary?.weightKg ?? 0, 0)} kg)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-2 border-l-4 border-l-emerald-600 shadow-2xs'>
          <CardContent className='p-0 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                Chuyến xe (TRIP) xác nhận
              </span>
              <IconRoute className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div
              className='text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-300'
              data-testid='kpi-total-trips'
            >
              {formatNumberVn(summary?.tripCount ?? 0, 0)} chuyến
            </div>
            <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
              <span>
                Xe nhập:{' '}
                <strong className='font-mono text-foreground'>
                  {summary?.inbound.tripCount ?? 0}
                </strong>{' '}
                • Xe xuất:{' '}
                <strong className='font-mono text-foreground'>
                  {summary?.outbound.tripCount ?? 0}
                </strong>
              </span>
              <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>
                Đã xác nhận
              </span>
            </div>
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
}

/**
 * Parallel Route Slot `@daily_stats`:
 * Renders SLIDE 2: Biểu đồ Cột Sản lượng theo Ngày (CBM) — Zero local filter controls.
 */
export function DailyOperationalBarSlot() {
  const {
    fromDate,
    toDate,
    data,
    directionLabel,
    isLoading,
    dailySeries,
    summary
  } = useAdminOperationalReport();

  return (
    <Card
      className='p-2.5 border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950'
      data-testid='slide-2-daily-chart-card'
    >
      <CardContent className='p-0 space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
          <div>
            <h2 className='text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100'>
              I. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG VẬN HÀNH ({fromDate} → {toDate})
            </h2>
            <p className='text-xs font-bold text-[#0F3D62] dark:text-blue-300'>
              1. Tình hình hoạt động của Hub —{' '}
              <span className='font-semibold text-muted-foreground'>
                {data?.filter.hubName || 'Tất cả Chi nhánh'} • {directionLabel}
              </span>
            </p>
          </div>
        </div>

        <div className='text-center'>
          <span className='text-sm font-bold tracking-wider text-slate-700 dark:text-slate-200'>
            CBM
          </span>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center h-64 text-xs text-muted-foreground gap-1.5'>
            <IconLoader2 className='h-4 w-4 animate-spin' />
            <span>Đang tổng hợp biểu đồ hoạt động của Hub...</span>
          </div>
        ) : (
          <div className='h-72 w-full' data-testid='slide-2-bar-chart-container'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={dailySeries}
                margin={{ top: 22, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#E2E8F0'
                />
                <XAxis
                  dataKey='dayLabel'
                  tick={{ fontSize: 10, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const pt = payload[0].payload as DailyReportPoint;
                    return (
                      <div className='rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-lg text-[10px] space-y-1'>
                        <div className='font-bold text-xs text-[#0F3D62] dark:text-blue-300'>
                          Ngày báo cáo: {pt.fullDateLabel}
                        </div>
                        <div className='font-mono text-muted-foreground'>
                          Khung giờ: {pt.windowLabel}
                        </div>
                        <div className='border-t pt-1 space-y-0.5'>
                          <div>
                            Số khối (CBM):{' '}
                            <strong className='font-mono text-foreground'>
                              {formatNumberVn(pt.cbm, 1)} CBM
                            </strong>{' '}
                            (Nhập: {formatNumberVn(pt.inbound.cbm, 1)} • Xuất:{' '}
                            {formatNumberVn(pt.outbound.cbm, 1)})
                          </div>
                          <div>
                            Số tấn:{' '}
                            <strong className='font-mono text-foreground'>
                              {formatNumberVn(pt.weightTons, 2)} Tấn
                            </strong>{' '}
                            ({formatNumberVn(pt.weightKg, 0)} kg)
                          </div>
                          
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey='cbm'
                  fill='#0F5C7E'
                  radius={[2, 2, 0, 0]}
                  maxBarSize={26}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey='cbm'
                    position='top'
                    formatter={(val: unknown) => {
                      const n = Number(val);
                      if (!n || n <= 0) return '';
                      return n.toFixed(1);
                    }}
                    style={{ fontSize: 9, fill: '#334155', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div
          className='flex flex-col items-center justify-center pt-1 border-t border-slate-100 dark:border-slate-800 text-center'
          data-testid='slide-2-summary-footer'
        >
          <div className='text-sm sm:text-base font-medium tracking-wide text-slate-900 dark:text-slate-100'>
            TỔNG SẢN LƯỢNG:{' '}
            <strong className='font-extrabold font-mono'>
              {formatNumberVn(summary?.cbm ?? 0, 1)}
            </strong>{' '}
            <em className='font-semibold not-italic'>CBM</em>
          </div>
          <div className='text-xs sm:text-sm font-medium tracking-wide text-slate-800 dark:text-slate-200'>
            TRUNG BÌNH:{' '}
            <strong className='font-bold font-mono'>
              {formatNumberVn(summary?.averageCbmPerDay ?? 0, 1)}
            </strong>{' '}
            <em className='font-semibold not-italic'>CBM/NGÀY</em>
            <span className='text-[10px] text-muted-foreground ml-1.5'>
              (Tính trên {summary?.effectiveDaysCount ?? 1} ngày đã mở kỳ •{' '}
              {summary?.activeDaysCount ?? 0} ngày phát sinh sản lượng)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Parallel Route Slot `@monthly_trends`:
 * Renders SLIDE 3: Biểu đồ Đường Xu hướng theo Tháng (SỐ KHỐI & SỐ TẤN).
 */
export function MonthlyOperationalTrendsSlot() {
  const { monthlySeries } = useAdminOperationalReport();

  return (
    <Card
      className='p-2.5 border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950'
      data-testid='slide-3-monthly-charts-card'
    >
      <CardContent className='p-0 space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
          <div>
            <h2 className='text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100'>
              I. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG VẬN HÀNH — XU HƯỚNG THEO THÁNG
            </h2>
            <p className='text-xs font-bold text-[#0F3D62] dark:text-blue-300'>
              1. Tình hình hoạt động của Hub (So sánh Số Khối &amp; Số Tấn qua
              các tháng)
            </p>
          </div>
          <Badge
            variant='outline'
            className='text-[10px] px-1.5 py-0 h-4 bg-slate-500/10 text-slate-700 dark:text-slate-300'
          >
            Chu kỳ mỗi ngày trong tháng: 06:00 ngày D → 05:59 ngày D+1
          </Badge>
        </div>

        {/* Biểu đồ trên (Slide 3 Top): SỐ KHỐI (CBM) */}
        <div
          className='rounded-md border border-slate-300 dark:border-slate-700 bg-linear-to-b from-slate-100 via-slate-200/70 to-slate-200/90 dark:from-slate-800 dark:to-slate-900 p-2'
          data-testid='slide-3-cbm-line-chart'
        >
          <div className='text-center text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-1'>
            SỐ KHỐI
          </div>
          <div className='h-52 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart
                data={monthlySeries}
                margin={{ top: 32, right: 36, left: 24, bottom: 6 }}
              >
                <CartesianGrid stroke='#CBD5E1' vertical={false} />
                <XAxis
                  dataKey='monthLabel'
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  hide
                  domain={[
                    0,
                    (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.25))
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const m = payload[0].payload as MonthlyReportPoint;
                    return (
                      <div className='rounded border bg-white dark:bg-slate-900 p-2 shadow-md text-[10px] space-y-0.5'>
                        <div className='font-bold text-[#0F3D62] dark:text-blue-300'>
                          {m.monthLabel} ({m.monthKey})
                        </div>
                        <div>
                          Số khối:{' '}
                          <strong className='font-mono'>
                            {formatNumberVn(m.cbm, 1)} CBM
                          </strong>{' '}
                          (Nhập: {formatNumberVn(m.inbound.cbm, 1)} • Xuất:{' '}
                          {formatNumberVn(m.outbound.cbm, 1)})
                        </div>
                        <div>
                          Số chuyến xác nhận:{' '}
                          <strong>{m.tripCount} chuyến</strong> •{' '}
                          {m.packageCount} kiện
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type='linear'
                  dataKey='cbm'
                  stroke='#0F5C7E'
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  dot={{
                    r: 8,
                    fill: '#0F5C7E',
                    stroke: '#0F5C7E',
                    strokeWidth: 2
                  }}
                  activeDot={{ r: 9, fill: '#0F3D62' }}
                >
                  <LabelList dataKey='cbm' content={renderMonthlyCbmCallout} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ dưới (Slide 3 Bottom): SỐ TẤN */}
        <div
          className='rounded-md border border-[#0b4660] bg-[#0F5C7E] text-white p-2'
          data-testid='slide-3-tons-line-chart'
        >
          <div className='text-center text-sm font-extrabold uppercase tracking-wider text-white mb-1'>
            SỐ TẤN
          </div>
          <div className='h-52 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart
                data={monthlySeries}
                margin={{ top: 28, right: 36, left: 10, bottom: 6 }}
              >
                <CartesianGrid
                  stroke='rgba(255,255,255,0.18)'
                  vertical={true}
                  horizontal={true}
                />
                <XAxis
                  dataKey='monthLabel'
                  tick={{ fontSize: 10, fill: '#FFFFFF', fontWeight: 600 }}
                  axisLine={{ stroke: '#FFFFFF' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#E2E8F0' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={[
                    0,
                    (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.25))
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const m = payload[0].payload as MonthlyReportPoint;
                    return (
                      <div className='rounded border border-slate-700 bg-slate-900 text-white p-2 shadow-md text-[10px] space-y-0.5'>
                        <div className='font-bold text-sky-300'>
                          {m.monthLabel} ({m.monthKey})
                        </div>
                        <div>
                          Số tấn:{' '}
                          <strong className='font-mono'>
                            {formatNumberVn(m.weightTons, 2)} Tấn
                          </strong>{' '}
                          ({formatNumberVn(m.weightKg, 0)} kg)
                        </div>
                        <div>
                          Nhập: {formatNumberVn(m.inbound.weightTons, 2)} Tấn •
                          Xuất: {formatNumberVn(m.outbound.weightTons, 2)} Tấn
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type='linear'
                  dataKey='weightTons'
                  stroke='#FFFFFF'
                  strokeWidth={3}
                  isAnimationActive={false}
                  dot={{
                    r: 4,
                    fill: '#FFFFFF',
                    stroke: '#FFFFFF',
                    strokeWidth: 2
                  }}
                  activeDot={{ r: 6, fill: '#38BDF8' }}
                >
                  <LabelList
                    dataKey='weightTons'
                    content={renderMonthlyTonsCallout}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Parallel Route Slot `@drilldown_table`:
 * Widget Theo dõi chi tiết mã TRIP & Bảng đối soát Số xe Nhập/Xuất theo ngày,
 * kết nối trực tiếp sang trang chuyên biệt `/dashboard/admin/reports/trips?date=YYYY-MM-DD`.
 */
export function OperationalDrilldownTableSlot() {
  const {
    activeTab,
    setActiveTab,
    dailySeries,
    confirmedTrips,
    selectedHubId,
    summary
  } = useAdminOperationalReport();

  const buildDayTripsHref = (reportDate?: string) => {
    const params = new URLSearchParams();
    if (reportDate) params.set('date', reportDate);
    if (selectedHubId && selectedHubId !== 'ALL') {
      params.set('hubId', selectedHubId);
    }
    const qs = params.toString();
    return `/dashboard/admin/reports/trips${qs ? `?${qs}` : ''}`;
  };

  return (
    <Card
      className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'
      data-testid='trip-tracking-widget'
    >
      <CardContent className='p-0 space-y-1.5'>
        <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-bold bg-[#0F3D62] text-white shadow-xs' data-testid='tab-daily-breakdown'>
              Bảng kê theo ngày ({dailySeries.length} ngày)
            </span>
          </div>

          <div className='flex flex-wrap items-center gap-1.5'>
            <Badge
              variant='outline'
              className='text-[10px] px-1.5 py-0 h-5 bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300 font-mono'
            >
              Xe nhập kho: {summary?.inbound.tripCount ?? 0} xe
            </Badge>
            <Badge
              variant='outline'
              className='text-[10px] px-1.5 py-0 h-5 bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300 font-mono'
            >
              Xe xuất kho: {summary?.outbound.tripCount ?? 0} xe
            </Badge>
            <Link href={buildDayTripsHref()}>
              <Button
                type='button'
                size='sm'
                variant='outline'
                data-testid='widget-open-daily-trips-btn'
                className='h-7 px-2 text-[10px] font-bold border-blue-300 dark:border-blue-800 text-[#0F3D62] dark:text-blue-300 hover:bg-blue-50 cursor-pointer'
              >
                <IconRoute className='h-3 w-3 mr-1' />
                Xem chi tiết TRIP theo từng ngày
              </Button>
            </Link>
          </div>
        </div>

        {/* TAB 1: Bảng kê theo ngày */}
        {activeTab === 'daily' && (
          <div className='max-h-80 overflow-auto rounded border'>
            <table className='w-full border-collapse text-left'>
              <thead className='sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10'>
                <tr className='text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300'>
                  <th className='py-1 px-1.5'>Ngày báo cáo</th>
                  <th className='py-1 px-1.5'>
                    Khung giờ tổng hợp (06:00 D → 05:59 D+1)
                  </th>
                  <th className='py-1 px-1.5'>Trạng thái kỳ</th>
                  <th className='py-1 px-1.5 text-right'>
                    Xe nhập (Chuyến / Kiện)
                  </th>
                  <th className='py-1 px-1.5 text-right'>
                    Nhập kho (CBM / Tấn)
                  </th>
                  <th className='py-1 px-1.5 text-right'>
                    Xe xuất (Chuyến / Kiện)
                  </th>
                  <th className='py-1 px-1.5 text-right'>
                    Xuất kho (CBM / Tấn)
                  </th>
                  <th className='py-1 px-1.5 text-right'>
                    Sản lượng chọn (CBM)
                  </th>
                  <th className='py-1 px-1.5 text-right'>Số Tấn chọn</th>
                  <th className='py-1 px-1.5 text-right'>Chi tiết TRIP ngày</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {dailySeries.map((d) => (
                  <tr
                    key={d.reportDate}
                    className='text-[10px] hover:bg-muted/60 transition-colors'
                  >
                    <td className='py-1 px-1.5 font-mono font-bold text-[#0F3D62] dark:text-blue-300'>
                      <Link
                        href={buildDayTripsHref(d.reportDate)}
                        className='hover:underline'
                      >
                        {d.fullDateLabel}
                      </Link>
                    </td>
                    <td className='py-1 px-1.5 font-mono text-muted-foreground'>
                      {d.windowLabel}
                    </td>
                    <td className='py-1 px-1.5'>
                      {d.isFuture ? (
                        <Badge
                          variant='outline'
                          className='text-[10px] px-1 py-0 h-4 bg-slate-500/10 text-slate-500'
                        >
                          Chưa mở kỳ
                        </Badge>
                      ) : d.isClosed ? (
                        <Badge
                          variant='outline'
                          className='text-[10px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300'
                        >
                          Đã chốt sổ 06:00
                        </Badge>
                      ) : (
                        <Badge
                          variant='outline'
                          className='text-[10px] px-1 py-0 h-4 bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-300'
                        >
                          Đang ghi nhận
                        </Badge>
                      )}
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono'>
                      <strong className='text-blue-700 dark:text-blue-300'>
                        {d.inbound.tripCount} xe nhập
                      </strong>{' '}
                      • {d.inbound.packageCount} kiện
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono'>
                      <span className='font-semibold text-blue-700 dark:text-blue-300'>
                        {formatNumberVn(d.inbound.cbm, 1)} CBM
                      </span>{' '}
                      • {formatNumberVn(d.inbound.weightTons, 2)} Tấn
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono'>
                      <strong className='text-emerald-700 dark:text-emerald-300'>
                        {d.outbound.tripCount} xe xuất
                      </strong>{' '}
                      • {d.outbound.packageCount} kiện
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono'>
                      <span className='font-semibold text-emerald-700 dark:text-emerald-300'>
                        {formatNumberVn(d.outbound.cbm, 1)} CBM
                      </span>{' '}
                      • {formatNumberVn(d.outbound.weightTons, 2)} Tấn
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono font-bold text-[#0F3D62] dark:text-blue-300'>
                      {formatNumberVn(d.cbm, 1)} CBM
                    </td>
                    <td className='py-1 px-1.5 text-right font-mono font-bold'>
                      {formatNumberVn(d.weightTons, 2)} Tấn
                    </td>
                    <td className='py-1 px-1.5 text-right'>
                      <Link
                        href={buildDayTripsHref(d.reportDate)}
                        data-testid={`btn-view-day-trips-${d.reportDate}`}
                        className='inline-flex items-center rounded border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#0F3D62] dark:text-blue-300 hover:bg-blue-100'
                      >
                        Xem {d.tripCount} xe (N:{d.inbound.tripCount}/X:
                        {d.outbound.tripCount})
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Danh sách chuyến xe (TRIP) xác nhận */}
        {activeTab === 'trips' && (
          <div className='max-h-80 overflow-auto rounded border'>
            <table className='w-full border-collapse text-left'>
              <thead className='sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10'>
                <tr className='text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300'>
                  <th className='py-1 px-1.5'>Mã chuyến (TRIP)</th>
                  <th className='py-1 px-1.5'>Chiều xác nhận</th>
                  <th className='py-1 px-1.5'>Thời điểm xác nhận</th>
                  <th className='py-1 px-1.5'>Kỳ báo cáo (06:00 → 05:59)</th>
                  <th className='py-1 px-1.5'>Chi nhánh Kho</th>
                  <th className='py-1 px-1.5'>Biển số / Tài xế</th>
                  <th className='py-1 px-1.5 text-right'>Số đơn / Kiện</th>
                  <th className='py-1 px-1.5 text-right'>Số Khối (CBM)</th>
                  <th className='py-1 px-1.5 text-right'>Số Tấn (Kg)</th>
                  <th className='py-1 px-1.5 text-right'>Tra cứu ngày</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {confirmedTrips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className='py-3 text-center text-xs text-muted-foreground'
                    >
                      Không có chuyến xe đã xác nhận nào trong khung thời gian
                      này.
                    </td>
                  </tr>
                ) : (
                  confirmedTrips.map((t, idx) => (
                    <tr
                      key={`${t.tripCode}-${t.direction}-${t.hubId}-${idx}`}
                      className='text-[10px] hover:bg-muted/60'
                    >
                      <td className='py-1 px-1.5'>
                        <Link
                          href={buildDayTripsHref(t.reportDate)}
                          className='font-mono text-[11px] font-bold text-[#0F3D62] dark:text-blue-300 hover:underline'
                        >
                          {t.tripCode}
                        </Link>
                        {t.invoiceCode && (
                          <div className='font-mono text-[10px] text-muted-foreground'>
                            {t.invoiceCode}
                          </div>
                        )}
                      </td>
                      <td className='py-1 px-1.5'>
                        {t.direction === 'INBOUND' ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] px-1 py-0 h-4 bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-300'
                          >
                            Xe nhập kho
                          </Badge>
                        ) : t.direction === 'TRANSFER' ? (
                          <Badge
                            variant='outline'
                            className='text-[10px] px-1 py-0 h-4 bg-purple-500/15 text-purple-700 border-purple-500/25 dark:text-purple-300'
                          >
                            Trung chuyển liên Hub
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='text-[10px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-300'
                          >
                            Xe xuất kho
                          </Badge>
                        )}
                      </td>
                      <td className='py-1 px-1.5 font-mono font-semibold text-foreground'>
                        {formatDateTimeVn(t.confirmedAt)}
                      </td>
                      <td className='py-1 px-1.5 font-mono'>
                        <span className='font-bold text-[#0F3D62] dark:text-blue-300'>
                          {t.reportDate}
                        </span>
                        <span className='block text-muted-foreground'>
                          {t.windowLabel}
                        </span>
                      </td>
                      <td className='py-1 px-1.5'>
                        <div className='flex items-center gap-1'>
                          {t.hubLevel > 1 ? (
                            <IconTruck className='h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0' />
                          ) : (
                            <IconBuildingWarehouse className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0' />
                          )}
                          <span className='font-semibold'>{t.hubName}</span>
                          {renderHubLevelBadge(
                            t.hubLevel,
                            t.hubCode,
                            t.hubName
                          )}
                        </div>
                      </td>
                      <td className='py-1 px-1.5'>
                        <span className='font-mono font-bold'>
                          {t.licensePlate || '—'}
                        </span>
                        {t.driverName && (
                          <span className='text-muted-foreground'>
                            {' '}
                            • {t.driverName}
                          </span>
                        )}
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono'>
                        {t.orderCount} đơn •{' '}
                        <strong>{t.packageCount} kiện</strong>
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono font-bold text-[#0F3D62] dark:text-blue-300'>
                        {formatNumberVn(t.volumeCbm, 1)} CBM
                      </td>
                      <td className='py-1 px-1.5 text-right font-mono'>
                        <strong>{formatNumberVn(t.weightTons, 2)} Tấn</strong>{' '}
                        <span className='text-muted-foreground'>
                          ({formatNumberVn(t.weightKg, 0)} kg)
                        </span>
                      </td>
                      <td className='py-1 px-1.5 text-right'>
                        <Link
                          href={buildDayTripsHref(t.reportDate)}
                          data-testid={`btn-open-trip-day-${t.tripCode}`}
                          className='inline-flex items-center rounded border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#0F3D62] dark:text-blue-300 hover:bg-blue-100'
                        >
                          Ngày {t.reportDate}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

/**
 * Layout Shell that coordinates Parallel Routes on `/dashboard/admin/reports`
 * while allowing subroutes like `/dashboard/admin/reports/trips` to render as standalone pages.
 */
export function AdminOperationalReportLayoutShell({
  children,
  daily_stats,
  monthly_trends,
  drilldown_table
}: {
  children: React.ReactNode;
  daily_stats: React.ReactNode;
  monthly_trends: React.ReactNode;
  drilldown_table?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTripsSubpage = pathname?.startsWith('/dashboard/admin/reports/trips');

  if (isTripsSubpage) {
    return (
      <PageContainer
        pageTitle='Theo Dõi Chi Tiết Mã TRIP Nhập/Xuất Theo Ngày'
        pageDescription='Kiểm tra chi tiết 1 ngày cụ thể (06:00 ngày D → 05:59 ngày D+1) có bao nhiêu xe nhập kho, bao nhiêu xe xuất kho và danh sách đơn hàng trong từng mã TRIP'
      >
        {children}
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle='Báo Cáo Kết Quả Hoạt Động Vận Hành'
      pageDescription='Tổng hợp sản lượng hoạt động của Hub theo ngày và xu hướng tháng (Cronjob chốt sổ 06:00 ngày D → 05:59 ngày D+1 theo thời điểm xác nhận chuyến xe)'
    >
      <AdminOperationalReportProvider>
        {/* Primary Slot: Single Global Filter Bar & 4 KPI Summary Cards */}
        {children}

        {/* Parallel Route Slot 1 (@daily_stats): Slide 2 — Biểu đồ Cột Sản lượng theo Ngày & Trung bình CBM/Ngày */}
        <div data-testid='parallel-slot-daily-stats'>{daily_stats}</div>

        {/* Parallel Route Slot 2 (@monthly_trends): Slide 3 — Biểu đồ Đường Xu hướng Tháng (SỐ KHỐI & SỐ TẤN) */}
        <div data-testid='parallel-slot-monthly-trends'>{monthly_trends}</div>
      </AdminOperationalReportProvider>
    </PageContainer>
  );
}

/**
 * Full composite component (fallback when not rendered via Parallel Route layout).
 */
export default function SuperAdminOperationalReport() {
  return (
    <AdminOperationalReportProvider>
      <AdminReportHeaderAndKpis />
      <DailyOperationalBarSlot />
      <MonthlyOperationalTrendsSlot />
    </AdminOperationalReportProvider>
  );
}
