'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconDownload,
  IconLoader2,
  IconRefresh,
  IconTruck
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';
import { formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOptionalAdminOperationalReport } from './super-admin-operational-report';

export interface RegionalMetricItem {
  region: string;
  onhandWeightKg: number;
  onhandWeightTons: number;
  onhandVolumeCbm: number;
  onhandPackageCount: number;
  onhandOrderCount: number;
  onhandOrderCodes: string[];
  draftOrderCodes: string[];
  incomingWeightKg: number;
  incomingWeightTons: number;
  incomingVolumeCbm: number;
  incomingPackageCount: number;
  incomingTripCount: number;
  totalWeightKg: number;
  totalWeightTons: number;
  totalVolumeCbm: number;
  recommendedVehicle: string;
  quickSnippet: string;
}

export interface RegionalReportApiResponse {
  draftRegions: Record<
    'north' | 'central' | 'south' | 'na',
    {
      weightKg: number;
      volumeCbm: number;
      orderCount?: number;
      orderCodes?: string[];
    }
  >;
  range: { fromDate: string; toDate: string };
  dailySeries: Array<{
    reportDate: string;
    hasSnapshot: boolean;
    onhandWeightKg: number;
    onhandVolumeCbm: number;
    onhandOrderCount: number;
    draftWeightKg: number;
    draftVolumeCbm: number;
    draftOrderCount: number;
    incomingWeightKg: number;
    incomingVolumeCbm: number;
    incomingTripCount: number;
    totalWeightKg: number;
    totalVolumeCbm: number;
  }>;
  hub: {
    id: number;
    code: string;
    name: string;
    level: number;
  };
  reportDate: string;
  cronInfo: {
    jobKey: string;
    name: string;
    cronTime: string;
    isEnabled: boolean;
    lastRunAt: string | null;
    lastRunStatus: string;
  };
  regions: {
    north: RegionalMetricItem;
    central: RegionalMetricItem;
    south: RegionalMetricItem;
    na: RegionalMetricItem;
  };
  totals: {
    totalWeightKg: number;
    totalWeightTons: number;
    totalVolumeCbm: number;
    onhandWeightKg: number;
    incomingWeightKg: number;
    packageCount: number;
    orderCount: number;
    incomingTripCount: number;
  };
  hubsList: Array<{ id: number; code: string; name: string; level: number }>;
  incomingTripsList: Array<{
    id: number;
    tripCode: string;
    licensePlate: string;
    driverName: string;
    status: string;
    originHubName: string;
    destinationHubName: string;
    weightKg: number;
    weightTons: number;
    volumeCbm: number;
    packageCount: number;
    orderCode: string;
    province: string;
    region: string;
    estimatedDeliveryDate: string | null;
  }>;
  onhandOrdersList: Array<{
    id: number;
    orderCode: string;
    province: string;
    region: string;
    remainingQuantity: number;
    totalQuantity: number;
    weightKg: number;
    weightTons: number;
    volumeCbm: number;
    goodsDescription: string | null;
    currentHubId: number;
    currentHubName: string;
  }>;
}

interface RegionRowConfig {
  key: 'north' | 'central' | 'south' | 'na';
  name: string;
  subtitle: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColorWeight: string;
  barColorVolume: string;
  dotColor: string;
}

const REGION_CONFIGS: RegionRowConfig[] = [
  {
    key: 'north',
    name: 'MIỀN BẮC',
    subtitle: 'Hà Nội, Hải Phòng, Bắc Ninh, Hải Dương...',
    badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-500/30',
    barColorWeight: 'bg-blue-600 dark:bg-blue-500',
    barColorVolume: 'bg-blue-500/80 dark:bg-blue-400/80',
    dotColor: 'bg-blue-600'
  },
  {
    key: 'central',
    name: 'MIỀN TRUNG',
    subtitle: 'Đà Nẵng, Huế, Quảng Nam, Nghệ An...',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    barColorWeight: 'bg-amber-500 dark:bg-amber-400',
    barColorVolume: 'bg-amber-400/80 dark:bg-amber-300/80',
    dotColor: 'bg-amber-500'
  },
  {
    key: 'south',
    name: 'MIỀN NAM',
    subtitle: 'TP.HCM, Bình Dương, Đồng Nai + 13 tỉnh Miền Tây Nam Bộ',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/30',
    barColorWeight: 'bg-purple-600 dark:bg-purple-500',
    barColorVolume: 'bg-purple-500/80 dark:bg-purple-400/80',
    dotColor: 'bg-purple-600'
  },
  {
    key: 'na',
    name: 'CHƯA PHÂN MIỀN (N/A)',
    subtitle: 'Đơn hàng thiếu/sai thông tin tỉnh thành đến',
    badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    badgeText: 'text-slate-600 dark:text-slate-300',
    badgeBorder: 'border-rose-500/30',
    barColorWeight: 'bg-slate-500 dark:bg-slate-400',
    barColorVolume: 'bg-rose-400/80 dark:bg-rose-300/80',
    dotColor: 'bg-rose-500'
  }
];

export function SuperAdminRegionalDispatchTable() {
  const queryClient = useQueryClient();
  const globalFilter = useOptionalAdminOperationalReport();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Keep the regional report query aligned with the shared date and hub filters.
  const selectedFromDate = globalFilter?.fromDate || todayStr;
  const selectedDate = globalFilter?.toDate || todayStr;
  const selectedHubId = globalFilter?.selectedHubId || 'ALL';
  const [chartStatus, setChartStatus] = useState<'onhand' | 'draft' | 'total'>('total');

  const {
    data: raw,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: [
      'admin-regional-dispatch-report-table',
      selectedHubId,
      selectedFromDate,
      selectedDate
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        hubId: selectedHubId,
        fromDate: selectedFromDate,
        toDate: selectedDate,
        mode: 'live'
      });
      const res = await apiClient.get<
        RegionalReportApiResponse | { data: RegionalReportApiResponse }
      >(`/api/v1/admin/reports/regional-dispatch?${params.toString()}`);
      return res.data;
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/admin/reports/regional-dispatch/sync', {
        date: selectedDate
      });
    },
    onSuccess: () => {
      toast.success('Đã đồng bộ chốt sổ dữ liệu cân đối đội xe thành công!');
      queryClient.invalidateQueries({
        queryKey: ['admin-regional-dispatch-report-table']
      });
    },
    onError: (err: unknown) => {
      toast.error(formatApiError(err));
    }
  });

  // Unwrap ApiResponse envelope safely
  const data = raw ? ('data' in raw ? raw.data : raw) : undefined;

  const totals = data?.totals || {
    totalWeightKg: 0,
    totalWeightTons: 0,
    totalVolumeCbm: 0,
    onhandWeightKg: 0,
    incomingWeightKg: 0,
    packageCount: 0,
    orderCount: 0,
    incomingTripCount: 0
  };

  const chartRegions = REGION_CONFIGS.map((cfg) => {
    const stored = data?.regions[cfg.key];
    const draft = data?.draftRegions?.[cfg.key];
    const weightKg =
      (chartStatus === 'draft' ? 0 : (stored?.onhandWeightKg ?? 0)) +
      (chartStatus === 'onhand' ? 0 : (draft?.weightKg ?? 0));
    const volumeCbm =
      (chartStatus === 'draft' ? 0 : (stored?.onhandVolumeCbm ?? 0)) +
      (chartStatus === 'onhand' ? 0 : (draft?.volumeCbm ?? 0));
    return {
      totalWeightKg: weightKg,
      totalWeightTons: weightKg / 1000,
      totalVolumeCbm: volumeCbm
    };
  });
  const chartTotals = chartRegions.reduce(
    (sum, region) => ({
      totalWeightKg: sum.totalWeightKg + region.totalWeightKg,
      totalWeightTons: sum.totalWeightTons + region.totalWeightTons,
      totalVolumeCbm: sum.totalVolumeCbm + region.totalVolumeCbm
    }),
    { totalWeightKg: 0, totalWeightTons: 0, totalVolumeCbm: 0 }
  );

  const handleExportExcel = () => {
    if (!data?.regions) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = REGION_CONFIGS.map((c) => {
      const r = data.regions[c.key];
      return {
        'Vùng / Miền': c.name,
        'Sẵn kho (Tấn)': r?.onhandWeightTons || 0,
        'Sẵn kho (Kg)': r?.onhandWeightKg || 0,
        'Sẵn kho (m³)': r?.onhandVolumeCbm || 0,
        'Sẵn kho (Kiện)': r?.onhandPackageCount || 0,
        'Xe sắp về (Tấn)': r?.incomingWeightTons || 0,
        'Xe sắp về (Kg)': r?.incomingWeightKg || 0,
        'Xe sắp về (m³)': r?.incomingVolumeCbm || 0,
        'Số xe sắp về': r?.incomingTripCount || 0,
        'TỔNG TẢI (TẤN)': r?.totalWeightTons || 0,
        'TỔNG TẢI (KG)': r?.totalWeightKg || 0,
        'TỔNG KHỐI (M³)': r?.totalVolumeCbm || 0,
        'Đề xuất điều xe': r?.recommendedVehicle || ''
      };
    });

    summaryRows.push({
      'Vùng / Miền': 'TỔNG CỘNG TOÀN QUỐC',
      'Sẵn kho (Tấn)': Math.round(((totals.onhandWeightKg || 0) / 1000) * 100) / 100,
      'Sẵn kho (Kg)': totals.onhandWeightKg || 0,
      'Sẵn kho (m³)': 0,
      'Sẵn kho (Kiện)': totals.packageCount || 0,
      'Xe sắp về (Tấn)': Math.round(((totals.incomingWeightKg || 0) / 1000) * 100) / 100,
      'Xe sắp về (Kg)': totals.incomingWeightKg || 0,
      'Xe sắp về (m³)': 0,
      'Số xe sắp về': totals.incomingTripCount || 0,
      'TỔNG TẢI (TẤN)': totals.totalWeightTons || 0,
      'TỔNG TẢI (KG)': totals.totalWeightKg || 0,
      'TỔNG KHỐI (M³)': totals.totalVolumeCbm || 0,
      'Đề xuất điều xe': 'Toàn hệ thống'
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Can_Doi_Doi_Xe');

    const fileName = `Can_Doi_Doi_Xe_${selectedHubId}_${selectedDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Đã xuất file ${fileName} thành công!`);
  };

  const naOrders = useMemo(() => {
    if (!data?.onhandOrdersList) return [];
    return data.onhandOrdersList.filter(
      (o) => o.region?.includes('N/A') || o.region === 'CHƯA PHÂN MIỀN (N/A)' || o.region === 'N/A'
    );
  }, [data]);

  const naTrips = useMemo(() => {
    if (!data?.incomingTripsList) return [];
    return data.incomingTripsList.filter(
      (t) => t.region?.includes('N/A') || t.region === 'CHƯA PHÂN MIỀN (N/A)' || t.region === 'N/A'
    );
  }, [data]);

  return (
    <Card className='border border-slate-200 dark:border-slate-800 shadow-sm'>
      {/* Table Header Bar */}
      <div className='p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-md bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'>
              <IconTruck className='h-4 w-4' />
            </div>
            <h3 className='text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
              Tình hình hàng hóa
              <Badge
                variant='outline'
                className='text-[10px] py-0 px-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40'
              >
                Thời gian thực (Live)
              </Badge>
              {data?.cronInfo?.cronTime && (
                <Badge
                  variant='outline'
                  className='text-[10px] py-0 px-1.5 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono'
                >
                  Lịch Cronjob: {data.cronInfo.cronTime}
                </Badge>
              )}
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className='flex items-center flex-wrap gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isFetching}
            className='h-8 text-xs gap-1.5'
          >
            <IconRefresh className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={handleExportExcel}
            disabled={isLoading || !data}
            className='h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/40'
          >
            <IconDownload className='h-3.5 w-3.5' />
            Xuất Excel
          </Button>

          <Button
            size='sm'
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isLoading}
            className='h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white'
          >
            {syncMutation.isPending ? (
              <IconLoader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <IconRefresh className='h-3.5 w-3.5' />
            )}
            Đồng bộ số liệu
          </Button>
        </div>
      </div>
      <CardContent className='p-0'>
        {/* Warning Banner if N/A cargo detected */}
        {data?.regions?.na &&
          (data.regions.na.totalWeightKg > 0 ||
            data.regions.na.totalVolumeCbm > 0 ||
            data.regions.na.onhandOrderCount > 0 ||
            data.regions.na.incomingTripCount > 0) && (
            <div className='mx-3 mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 flex items-start gap-2.5 shadow-xs'>
              <IconAlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0' />
              <div className='text-xs text-amber-800 dark:text-amber-300 space-y-2 flex-1'>
                <div>
                  <span className='font-bold'>CẢNH BÁO DỮ LIỆU CHƯA PHÂN MIỀN: </span>
                  Có{' '}
                  {data.regions.na.onhandOrderCount > 0
                    ? `${formatNumber(data.regions.na.onhandOrderCount)} đơn tồn kho`
                    : ''}
                  {data.regions.na.onhandOrderCount > 0 && data.regions.na.incomingTripCount > 0
                    ? ' và '
                    : ''}
                  {data.regions.na.incomingTripCount > 0
                    ? `${formatNumber(data.regions.na.incomingTripCount)} chuyến xe sắp về`
                    : ''}{' '}
                  ({formatNumber(data.regions.na.totalWeightTons)} Tấn •{' '}
                  {formatNumber(data.regions.na.totalVolumeCbm)} m³) chưa xác định được Miền do nhập
                  sai hoặc thiếu tỉnh thành đến. Vui lòng rà soát lại:
                </div>

                {/* Danh sách các đơn N/A cụ thể hiển thị trực tiếp */}
                {naOrders.length > 0 && (
                  <div className='pt-1.5 border-t border-amber-200 dark:border-amber-900/40 space-y-1'>
                    <div className='font-bold text-[11px] text-amber-900 dark:text-amber-200'>
                      Danh sách đơn hàng cụ thể cần rà soát:
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {naOrders.map((ord) => (
                        <span
                          key={ord.id}
                          className='inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-[11px] font-mono shadow-2xs'
                        >
                          <strong className='text-purple-700 dark:text-purple-300'>
                            {ord.orderCode}
                          </strong>
                          <span className='text-slate-600 dark:text-slate-300 font-sans'>
                            (Tỉnh nhập:{' '}
                            <strong className='text-rose-600 dark:text-rose-400'>
                              {ord.province || 'Chưa nhập'}
                            </strong>{' '}
                            • {formatNumber(ord.remainingQuantity)} kiện •{' '}
                            {formatNumber(ord.volumeCbm)} m³ • {ord.currentHubName})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Danh sách các chuyến xe N/A nếu có */}
                {naTrips.length > 0 && (
                  <div className='pt-1.5 border-t border-amber-200 dark:border-amber-900/40 space-y-1'>
                    <div className='font-bold text-[11px] text-amber-900 dark:text-amber-200'>
                      Danh sách chuyến xe sắp về chưa có tỉnh/Hub đích rõ ràng:
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {naTrips.map((tr) => (
                        <span
                          key={tr.id}
                          className='inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-[11px] font-mono shadow-2xs'
                        >
                          <strong className='text-blue-700 dark:text-blue-300'>
                            {tr.tripCode}
                          </strong>
                          <span className='text-slate-600 dark:text-slate-300 font-sans'>
                            (BS: {tr.licensePlate || '—'} • {tr.originHubName} →{' '}
                            {tr.destinationHubName})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className='py-12 flex flex-col items-center justify-center gap-2 text-slate-400'>
            <IconLoader2 className='h-7 w-7 animate-spin text-purple-600' />
            <span className='text-xs'>Đang tải dữ liệu cân đối đội xe...</span>
          </div>
        ) : (
          <>
            {/* Visual Horizontal Bar Chart Section (Styled exactly like user reference image) */}
            {data?.regions && (
              <div className='p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-2'>
                {/* Chart Toolbar */}
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <div
                    role='group'
                    aria-label='Trạng thái đơn hàng'
                    className='flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs'
                  >
                    {(
                      [
                        ['onhand', 'Lưu kho'],
                        ['draft', 'Đơn nháp'],
                        ['total', 'Tổng hợp']
                      ] as const
                    ).map(([status, label]) => (
                      <button
                        key={status}
                        type='button'
                        aria-pressed={chartStatus === status}
                        onClick={() => setChartStatus(status)}
                        className={`h-8 px-2.5 rounded text-xs font-medium cursor-pointer ${
                          chartStatus === status
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Charts Grid */}
                <div className='grid gap-2 grid-cols-1 lg:grid-cols-2'>
                  {/* Chart 1: Weight (Tấn • Kg) */}
                  {
                    <div
                      data-testid='regional-weight-chart'
                      className='p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2'
                    >
                      <div className='flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2'>
                        <div className='flex items-center gap-1.5'>
                          <span className='inline-block w-2.5 h-2.5 rounded-full bg-purple-600' />
                          <span className='font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100'>
                            Khối Lượng Vận Tải Theo Miền (kg)
                          </span>
                        </div>
                        <span className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'>
                          Tổng: {formatNumber(chartTotals.totalWeightKg)} kg
                        </span>
                      </div>

                      {/* Horizontal Bars */}
                      <div className='space-y-2 pt-1'>
                        {REGION_CONFIGS.map((cfg, index) => {
                          const metric = chartRegions[index];
                          const weightPct =
                            chartTotals.totalWeightKg > 0 && metric?.totalWeightKg
                              ? Math.round(
                                  (metric.totalWeightKg / chartTotals.totalWeightKg) * 1000
                                ) / 10
                              : 0;
                          return (
                            <div key={cfg.key} className='flex items-center gap-2.5 py-1'>
                              {/* Label on left (right-aligned, clean font like reference image) */}
                              <div className='w-28 sm:w-36 text-right shrink-0 pr-1'>
                                <span className='font-bold text-xs text-slate-700 dark:text-slate-300 block truncate'>
                                  {cfg.name}
                                </span>
                              </div>

                              {/* Bar + End-of-bar value (Styled exactly like user reference image) */}
                              <div className='flex-1 flex items-center min-w-0'>
                                <div
                                  className={`h-6 sm:h-7 ${cfg.barColorWeight} rounded-r-md transition-all duration-700 ease-out shadow-xs shrink-0`}
                                  style={{
                                    width: `${Math.max(
                                      weightPct > 0 ? weightPct : 0,
                                      (metric?.totalWeightKg || 0) > 0 ? 3 : 0
                                    )}%`,
                                    maxWidth: 'calc(100% - 170px)'
                                  }}
                                />
                                <span
                                  className={`ml-2 font-bold text-xs sm:text-sm ${cfg.badgeText} font-mono whitespace-nowrap shrink-0`}
                                >
                                  {formatNumber(metric?.totalWeightKg ?? 0)} kg
                                  <span className='text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1'>
                                    ({weightPct}%)
                                  </span>
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Bottom axis line with ticks & scale (0 ... 100) */}
                        <div className='flex items-center gap-2.5 pt-1.5'>
                          <div className='w-28 sm:w-36 shrink-0' />
                          <div className='flex-1 border-t border-slate-300 dark:border-slate-700 pt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono'>
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  }

                  {/* Chart 2: Volume (m³) */}
                  {
                    <div
                      data-testid='regional-volume-chart'
                      className='p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2'
                    >
                      <div className='flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2'>
                        <div className='flex items-center gap-1.5'>
                          <span className='inline-block w-2.5 h-2.5 rounded-full bg-purple-600' />
                          <span className='font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100'>
                            Thể Tích Hàng Hóa Theo Miền (m³)
                          </span>
                        </div>
                        <span className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'>
                          Tổng: {formatNumber(chartTotals.totalVolumeCbm)} m³
                        </span>
                      </div>

                      {/* Horizontal Bars */}
                      <div className='space-y-2 pt-1'>
                        {REGION_CONFIGS.map((cfg, index) => {
                          const metric = chartRegions[index];
                          const volumePct =
                            chartTotals.totalVolumeCbm > 0 && metric?.totalVolumeCbm
                              ? Math.round(
                                  (metric.totalVolumeCbm / chartTotals.totalVolumeCbm) * 1000
                                ) / 10
                              : 0;
                          return (
                            <div key={cfg.key} className='flex items-center gap-2.5 py-1'>
                              {/* Label on left (right-aligned, clean font like reference image) */}
                              <div className='w-28 sm:w-36 text-right shrink-0 pr-1'>
                                <span className='font-bold text-xs text-slate-700 dark:text-slate-300 block truncate'>
                                  {cfg.name}
                                </span>
                              </div>

                              {/* Bar + End-of-bar value (Styled exactly like user reference image) */}
                              <div className='flex-1 flex items-center min-w-0'>
                                <div
                                  className={`h-6 sm:h-7 ${cfg.barColorWeight} rounded-r-md transition-all duration-700 ease-out shadow-xs shrink-0`}
                                  style={{
                                    width: `${Math.max(
                                      volumePct > 0 ? volumePct : 0,
                                      (metric?.totalVolumeCbm || 0) > 0 ? 3 : 0
                                    )}%`,
                                    maxWidth: 'calc(100% - 170px)'
                                  }}
                                />
                                <span
                                  className={`ml-2 font-bold text-xs sm:text-sm ${cfg.badgeText} font-mono whitespace-nowrap shrink-0`}
                                >
                                  {formatNumber(metric?.totalVolumeCbm || 0)} m³
                                  <span className='text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1'>
                                    ({volumePct}%)
                                  </span>
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Bottom axis line with ticks & scale (0 ... 100) */}
                        <div className='flex items-center gap-2.5 pt-1.5'>
                          <div className='w-28 sm:w-36 shrink-0' />
                          <div className='flex-1 border-t border-slate-300 dark:border-slate-700 pt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono'>
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            )}
            <div className='grid gap-1.5 border-b border-slate-200 p-2 dark:border-slate-800 sm:grid-cols-2'>
              {REGION_CONFIGS.map((region) => {
                const metrics = data?.regions?.[region.key];
                const draft = data?.draftRegions?.[region.key];
                const draftCodes = draft?.orderCodes || [];
                const storedCodes = metrics?.onhandOrderCodes || [];
                return (
                  <details
                    key={region.key}
                    className='rounded border border-slate-200 px-2 py-1 dark:border-slate-700'
                  >
                    <summary className='cursor-pointer text-[10px] font-semibold text-slate-700 dark:text-slate-200'>
                      {region.name}: Lưu kho {formatNumber(metrics?.onhandOrderCount ?? 0)} mã · Đơn
                      nháp {formatNumber(draft?.orderCount ?? 0)} mã
                    </summary>
                    <div className='space-y-1.5 pt-1.5'>
                      <div className='flex flex-wrap gap-1'>
                        <span className='w-full text-[10px] font-semibold'>Mã vận đơn lưu kho</span>
                        {storedCodes.length ? (
                          storedCodes.map((code) => (
                            <span
                              key={`stored-${code}`}
                              className='rounded bg-blue-50 px-1 font-mono text-[10px] dark:bg-blue-950/40'
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className='text-[10px] text-slate-500'>
                            Chưa có mã lưu kho trong snapshot.
                          </span>
                        )}
                      </div>
                      <div className='flex flex-wrap gap-1'>
                        <span className='w-full text-[10px] font-semibold'>
                          Mã vận đơn đơn nháp
                        </span>
                        {draftCodes.length ? (
                          draftCodes.map((code) => (
                            <span
                              key={`draft-${code}`}
                              className='rounded bg-amber-50 px-1 font-mono text-[10px] dark:bg-amber-950/40'
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className='text-[10px] text-slate-500'>
                            Chưa có mã đơn nháp trong snapshot.
                          </span>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
