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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export interface RegionalMetricItem {
  region: string;
  onhandWeightKg: number;
  onhandWeightTons: number;
  onhandVolumeCbm: number;
  onhandPackageCount: number;
  onhandOrderCount: number;
  onhandOrderCodes: string[];
  draftWeightKg: number;
  draftVolumeCbm: number;
  draftOrderCount: number;
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
      orderCount: number;
      orderCodes: string[];
    }
  >;
  hub: {
    id: number;
    code: string;
    name: string;
    level: number;
  };
  reportDate: string;
  range: { fromDate: string; toDate: string };
  dailySeries: Array<Record<string, unknown>>;
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
  provinceAudit?: {
    orders: Array<{ province: string | null }>;
  };
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
  chartColors: {
    onhand: string;
    draft: string;
    completed: string;
  };
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
    chartColors: { onhand: '#2563EB', draft: '#93C5FD', completed: '#1D4ED8' },
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
    chartColors: { onhand: '#F97316', draft: '#FDBA74', completed: '#C2410C' },
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
    chartColors: { onhand: '#7C3AED', draft: '#C4B5FD', completed: '#5B21B6' },
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
    chartColors: { onhand: '#64748B', draft: '#CBD5E1', completed: '#334155' },
    dotColor: 'bg-rose-500'
  }
];

export function SuperAdminRegionalDispatchTable() {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Báo cáo cân đối đội xe là báo cáo toàn hệ thống; hubId chỉ giữ lại để tương thích API.
  // Không để bộ lọc Hub của báo cáo vận hành làm thay đổi hoặc refetch số liệu này.
  const selectedDate = todayStr;
  const selectedHubId = 'ALL';
  const [chartStatus, setChartStatus] = useState<'onhand' | 'draft' | 'total'>('total');

  const {
    data: raw,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['admin-regional-dispatch-report-table', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get<
        RegionalReportApiResponse | { data: RegionalReportApiResponse }
      >(`/api/v1/admin/reports/regional-dispatch?hubId=ALL`);
      return res.data;
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/v1/admin/reports/regional-dispatch/sync', {
        reportDate: selectedDate
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
    const onhandWeightKg = chartStatus === 'draft' ? 0 : (stored?.onhandWeightKg ?? 0);
    const draftWeightKg =
      chartStatus === 'onhand' ? 0 : (stored?.draftWeightKg ?? draft?.weightKg ?? 0);
    const completedWeightKg =
      chartStatus === 'onhand' || chartStatus === 'draft' ? 0 : (stored?.incomingWeightKg ?? 0);
    const onhandVolumeCbm = chartStatus === 'draft' ? 0 : (stored?.onhandVolumeCbm ?? 0);
    const draftVolumeCbm =
      chartStatus === 'onhand' ? 0 : (stored?.draftVolumeCbm ?? draft?.volumeCbm ?? 0);
    const completedVolumeCbm =
      chartStatus === 'onhand' || chartStatus === 'draft' ? 0 : (stored?.incomingVolumeCbm ?? 0);
    return {
      region: cfg.name,
      onhandWeightKg,
      draftWeightKg,
      completedWeightKg,
      onhandWeightTons: onhandWeightKg / 1000,
      draftWeightTons: draftWeightKg / 1000,
      completedWeightTons: completedWeightKg / 1000,
      onhandVolumeCbm,
      draftVolumeCbm,
      completedVolumeCbm,
      totalWeightKg: onhandWeightKg + draftWeightKg + completedWeightKg,
      totalWeightTons: (onhandWeightKg + draftWeightKg + completedWeightKg) / 1000,
      totalVolumeCbm: onhandVolumeCbm + draftVolumeCbm + completedVolumeCbm,
      chartColors: cfg.chartColors
    };
  });
  const chartTotals =
    chartStatus === 'total'
      ? {
          totalWeightKg: Number(totals.totalWeightKg) || 0,
          totalWeightTons: (Number(totals.totalWeightKg) || 0) / 1000,
          totalVolumeCbm: Number(totals.totalVolumeCbm) || 0
        }
      : chartRegions.reduce(
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
        'Đã xuất kho (Tấn)': r?.incomingWeightTons || 0,
        'Đã xuất kho (Kg)': r?.incomingWeightKg || 0,
        'Đã xuất kho (m³)': r?.incomingVolumeCbm || 0,
        'Số đơn đã xuất': r?.incomingTripCount || 0,
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
      'Đã xuất kho (Tấn)': Math.round(((totals.incomingWeightKg || 0) / 1000) * 100) / 100,
      'Đã xuất kho (Kg)': totals.incomingWeightKg || 0,
      'Đã xuất kho (m³)': 0,
      'Số đơn đã xuất': totals.incomingTripCount || 0,
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
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className='py-12 flex flex-col items-center justify-center gap-2 text-slate-400'>
            <IconLoader2 className='h-7 w-7 animate-spin text-purple-600' />
            <span className='text-xs'>Đang tải dữ liệu...</span>
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
                        ['draft', 'Dự kiến nhập kho'],
                        ['total', 'Tất cả']
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
                            Khối lượng hàng hóa theo Khu vực (Tấn)
                          </span>
                        </div>
                        <span
                          data-testid='regional-weight-total'
                          className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'
                        >
                          Tổng: {formatNumber(chartTotals.totalWeightKg / 1000)} Tấn
                        </span>
                      </div>
                      <div className='h-56 pt-1'>
                        <ResponsiveContainer
                          width='100%'
                          height='100%'
                          initialDimension={{ width: 320, height: 224 }}
                        >
                          <BarChart
                            data={chartRegions}
                            layout='vertical'
                            margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                          >
                            <CartesianGrid
                              strokeDasharray='3 3'
                              horizontal={false}
                              stroke='#E2E8F0'
                            />
                            <XAxis
                              type='number'
                              tick={{ fontSize: 10, fill: '#64748B' }}
                              axisLine={{ stroke: '#CBD5E1' }}
                              tickLine={false}
                            />
                            <YAxis
                              type='category'
                              dataKey='region'
                              width={112}
                              tick={{
                                fontSize: 10,
                                fontWeight: 700,
                                fill: '#475569'
                              }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) =>
                                name === 'Đã xuất kho'
                                  ? null
                                  : [`${formatNumber(Number(value))} Tấn`, String(name)]
                              }
                              contentStyle={{ fontSize: 10, borderRadius: 6 }}
                            />
                            {chartStatus !== 'draft' && (
                              <Bar
                                dataKey='onhandWeightTons'
                                name='Lưu kho'
                                stackId='weight'
                                radius={0}
                              >
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`weight-onhand-${entry.region}`}
                                    fill={entry.chartColors.onhand}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus !== 'onhand' && (
                              <Bar
                                dataKey='draftWeightTons'
                                name='Nháp'
                                stackId='weight'
                                radius={0}
                              >
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`weight-draft-${entry.region}`}
                                    fill={entry.chartColors.draft}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus === 'total' && (
                              <Bar
                                dataKey='completedWeightTons'
                                name='Đã xuất kho'
                                stackId='weight'
                                radius={0}
                              >
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`weight-completed-${entry.region}`}
                                    fill={entry.chartColors.completed}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus === 'total' && <Legend wrapperStyle={{ fontSize: 10 }} />}
                          </BarChart>
                        </ResponsiveContainer>
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
                            Thể tích hàng hóa theo Khu vực (m³)
                          </span>
                        </div>
                        <span
                          data-testid='regional-volume-total'
                          className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'
                        >
                          Tổng: {formatNumber(chartTotals.totalVolumeCbm)} m³
                        </span>
                      </div>
                      <div className='h-56 pt-1'>
                        <ResponsiveContainer
                          width='100%'
                          height='100%'
                          initialDimension={{ width: 320, height: 224 }}
                        >
                          <BarChart
                            data={chartRegions}
                            layout='vertical'
                            margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
                          >
                            <CartesianGrid
                              strokeDasharray='3 3'
                              horizontal={false}
                              stroke='#E2E8F0'
                            />
                            <XAxis
                              type='number'
                              tick={{ fontSize: 10, fill: '#64748B' }}
                              axisLine={{ stroke: '#CBD5E1' }}
                              tickLine={false}
                            />
                            <YAxis
                              type='category'
                              dataKey='region'
                              width={112}
                              tick={{
                                fontSize: 10,
                                fontWeight: 700,
                                fill: '#475569'
                              }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) =>
                                name === 'Đã xuất kho'
                                  ? null
                                  : [`${formatNumber(Number(value))} m³`, String(name)]
                              }
                              contentStyle={{ fontSize: 10, borderRadius: 6 }}
                            />
                            {chartStatus !== 'draft' && (
                              <Bar
                                dataKey='onhandVolumeCbm'
                                name='Lưu kho'
                                stackId='volume'
                                radius={0}
                              >
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`volume-onhand-${entry.region}`}
                                    fill={entry.chartColors.onhand}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus !== 'onhand' && (
                              <Bar dataKey='draftVolumeCbm' name='Nháp' stackId='volume' radius={0}>
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`volume-draft-${entry.region}`}
                                    fill={entry.chartColors.draft}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus === 'total' && (
                              <Bar
                                dataKey='completedVolumeCbm'
                                name='Đã xuất kho'
                                stackId='volume'
                                radius={0}
                              >
                                {chartRegions.map((entry) => (
                                  <Cell
                                    key={`volume-completed-${entry.region}`}
                                    fill={entry.chartColors.completed}
                                  />
                                ))}
                              </Bar>
                            )}
                            {chartStatus === 'total' && <Legend wrapperStyle={{ fontSize: 10 }} />}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  }
                </div>
              </div>
            )}
          </>
        )}

        {/* Warning Banner if N/A cargo detected */}
        {data?.regions?.na &&
          (data.regions.na.totalWeightKg > 0 ||
            data.regions.na.totalVolumeCbm > 0 ||
            data.regions.na.onhandOrderCount > 0 ||
            data.regions.na.incomingTripCount > 0) && (
            <div className='mx-3 mt-3 mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 flex items-start gap-2.5 shadow-xs'>
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
                    ? `${formatNumber(data.regions.na.incomingTripCount)} đơn đã xuất kho`
                    : ''}{' '}
                  ({formatNumber(data.regions.na.totalWeightTons)} Tấn •{' '}
                  {formatNumber(data.regions.na.totalVolumeCbm)} m³) chưa xác định được Miền do nhập
                  sai hoặc thiếu tỉnh thành đến. Vui lòng rà soát lại:
                </div>

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
      </CardContent>
    </Card>
  );
}
