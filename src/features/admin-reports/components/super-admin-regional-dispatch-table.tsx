'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconBuildingWarehouse,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconDownload,
  IconEye,
  IconInfoCircle,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTable,
  IconTruck
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export interface RegionalMetricItem {
  region: string;
  onhandWeightKg: number;
  onhandWeightTons: number;
  onhandVolumeCbm: number;
  onhandPackageCount: number;
  onhandOrderCount: number;
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
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/30',
    barColorWeight: 'bg-rose-500 dark:bg-rose-400',
    barColorVolume: 'bg-rose-400/80 dark:bg-rose-300/80',
    dotColor: 'bg-rose-500'
  }
];

export function SuperAdminRegionalDispatchTable() {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showVisualChart, setShowVisualChart] = useState<boolean>(true);
  const [chartMetricTab, setChartMetricTab] = useState<'both' | 'weight' | 'volume'>('both');

  // Drilldown Modal
  const [drilldownRegion, setDrilldownRegion] = useState<{
    key: 'north' | 'central' | 'south' | 'na';
    name: string;
    metric: RegionalMetricItem;
  } | null>(null);
  const [drilldownTab, setDrilldownTab] = useState<'incoming' | 'onhand'>('incoming');
  const [drilldownSearch, setDrilldownSearch] = useState('');

  const {
    data: raw,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['admin-regional-dispatch-report-table', selectedHubId, selectedDate],
    queryFn: async () => {
      const res = await apiClient.get<any>(
        `/api/v1/admin/reports/regional-dispatch?hubId=${selectedHubId}&date=${selectedDate}&mode=live`
      );
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
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Đồng bộ snapshot thất bại. Vui lòng thử lại.'
      );
    }
  });

  // Unwrap ApiResponse envelope safely
  const data: RegionalReportApiResponse | undefined = (raw as any)?.data ?? (raw as any);

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

  // Find max values for horizontal bar scaling
  const maxWeightKg = useMemo(() => {
    if (!data?.regions) return 1;
    const weights = [
      data.regions.north?.totalWeightKg || 0,
      data.regions.central?.totalWeightKg || 0,
      data.regions.south?.totalWeightKg || 0,
      data.regions.na?.totalWeightKg || 0
    ];
    return Math.max(...weights, 1);
  }, [data]);

  const maxVolumeCbm = useMemo(() => {
    if (!data?.regions) return 1;
    const volumes = [
      data.regions.north?.totalVolumeCbm || 0,
      data.regions.central?.totalVolumeCbm || 0,
      data.regions.south?.totalVolumeCbm || 0,
      data.regions.na?.totalVolumeCbm || 0
    ];
    return Math.max(...volumes, 1);
  }, [data]);

  const handleCopySnippet = (key: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedKey(key);
    toast.success('Đã sao chép tin nhắn điều hành nhanh vào Clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

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

  // Filter drilldown items
  const filteredIncomingTrips = useMemo(() => {
    if (!drilldownRegion || !data?.incomingTripsList) return [];
    return data.incomingTripsList.filter((trip) => {
      const matchRegion = trip.region === drilldownRegion.name;
      if (!matchRegion) return false;
      if (!drilldownSearch) return true;
      const s = drilldownSearch.toLowerCase();
      return (
        trip.tripCode?.toLowerCase().includes(s) ||
        trip.licensePlate?.toLowerCase().includes(s) ||
        trip.driverName?.toLowerCase().includes(s) ||
        trip.province?.toLowerCase().includes(s)
      );
    });
  }, [drilldownRegion, data, drilldownSearch]);

  const filteredOnhandOrders = useMemo(() => {
    if (!drilldownRegion || !data?.onhandOrdersList) return [];
    return data.onhandOrdersList.filter((order) => {
      const matchRegion = order.region === drilldownRegion.name;
      if (!matchRegion) return false;
      if (!drilldownSearch) return true;
      const s = drilldownSearch.toLowerCase();
      return (
        order.orderCode?.toLowerCase().includes(s) ||
        order.province?.toLowerCase().includes(s) ||
        order.goodsDescription?.toLowerCase().includes(s)
      );
    });
  }, [drilldownRegion, data, drilldownSearch]);

  const naOrders = useMemo(() => {
    if (!data?.onhandOrdersList) return [];
    return data.onhandOrdersList.filter(
      (o) =>
        o.region?.includes('N/A') ||
        o.region === 'CHƯA PHÂN MIỀN (N/A)' ||
        o.region === 'N/A'
    );
  }, [data]);

  const naTrips = useMemo(() => {
    if (!data?.incomingTripsList) return [];
    return data.incomingTripsList.filter(
      (t) =>
        t.region?.includes('N/A') ||
        t.region === 'CHƯA PHÂN MIỀN (N/A)' ||
        t.region === 'N/A'
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
              Cân Đối Tải Trọng Đội Xe Theo Miền (Bắc - Trung - Nam)
              <Badge variant='outline' className='text-[10px] py-0 px-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40'>
                Thời gian thực (Live)
              </Badge>
              {data?.cronInfo?.cronTime && (
                <Badge variant='outline' className='text-[10px] py-0 px-1.5 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono'>
                  Lịch Cronjob: {data.cronInfo.cronTime}
                </Badge>
              )}
            </h3>
          </div>
          <p className='text-xs text-slate-500 dark:text-slate-400'>
            Tổng hợp sản lượng Tồn kho vật lý và Hàng sắp về từ xe liên Hub để điều phối Container 40ft & xe đầu kéo
          </p>
        </div>

        {/* Action Controls */}
        <div className='flex items-center flex-wrap gap-2'>
          <div className='flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1'>
            <IconCalendar className='h-3.5 w-3.5 text-slate-400' />
            <input
              type='date'
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='text-xs bg-transparent border-none focus:outline-none text-slate-700 dark:text-slate-200 cursor-pointer'
            />
          </div>

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
            onClick={() => setShowVisualChart(!showVisualChart)}
            className='h-8 text-xs gap-1.5'
          >
            <IconChartBar className='h-3.5 w-3.5 text-purple-600' />
            {showVisualChart ? 'Thu gọn biểu đồ' : 'Biểu đồ thanh ngang'}
            {showVisualChart ? (
              <IconChevronUp className='h-3 w-3 text-slate-400' />
            ) : (
              <IconChevronDown className='h-3 w-3 text-slate-400' />
            )}
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
                {data.regions.na.onhandOrderCount > 0 &&
                data.regions.na.incomingTripCount > 0
                  ? ' và '
                  : ''}
                {data.regions.na.incomingTripCount > 0
                  ? `${formatNumber(data.regions.na.incomingTripCount)} chuyến xe sắp về`
                  : ''}{' '}
                (
                {formatNumber(data.regions.na.totalWeightTons)} Tấn •{' '}
                {formatNumber(data.regions.na.totalVolumeCbm)} m³) chưa xác định được
                Miền do nhập sai hoặc thiếu tỉnh thành đến. Vui lòng rà soát lại:
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
            {data?.regions && showVisualChart && (
              <div className='p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-3'>
                {/* Chart Toolbar */}
                <div className='flex items-center justify-between flex-wrap gap-2'>
                  <div className='flex items-center gap-2'>
                    <div className='p-1 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'>
                      <IconChartBar className='h-4 w-4' />
                    </div>
                    <div>
                      <h4 className='text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
                        BIỂU ĐỒ THANH NGANG SO SÁNH TỶ TRỌNG CÂN ĐỐI THEO VÙNG MIỀN
                        <Badge
                          variant='outline'
                          className='text-[10px] py-0 px-1.5 font-normal border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300'
                        >
                          Mô hình thanh ngang
                        </Badge>
                      </h4>
                      <p className='text-[11px] text-slate-500 dark:text-slate-400'>
                        Trực quan hóa tỷ trọng Tải trọng (Tấn) và Thể tích (m³) tương quan giữa các miền
                      </p>
                    </div>
                  </div>

                  {/* Metric Tab Selector */}
                  <div className='flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs'>
                    <button
                      type='button'
                      onClick={() => setChartMetricTab('both')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        chartMetricTab === 'both'
                          ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Cả hai chỉ số
                    </button>
                    <button
                      type='button'
                      onClick={() => setChartMetricTab('weight')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        chartMetricTab === 'weight'
                          ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Khối Lượng (Tấn)
                    </button>
                    <button
                      type='button'
                      onClick={() => setChartMetricTab('volume')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        chartMetricTab === 'volume'
                          ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Thể Tích (m³)
                    </button>
                  </div>
                </div>

                {/* Visual Charts Grid */}
                <div
                  className={`grid gap-4 ${
                    chartMetricTab === 'both'
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1'
                  }`}
                >
                  {/* Chart 1: Weight (Tấn • Kg) */}
                  {(chartMetricTab === 'both' || chartMetricTab === 'weight') && (
                    <div className='p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5'>
                      <div className='flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2'>
                        <div className='flex items-center gap-1.5'>
                          <span className='inline-block w-2.5 h-2.5 rounded-full bg-purple-600' />
                          <span className='font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100'>
                            Khối Lượng Vận Tải Theo Miền (Tấn • Kg)
                          </span>
                        </div>
                        <span className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'>
                          Tổng: {formatNumber(totals.totalWeightTons)} Tấn
                        </span>
                      </div>

                      {/* Horizontal Bars */}
                      <div className='space-y-2 pt-1'>
                        {REGION_CONFIGS.map((cfg) => {
                          const metric = data.regions[cfg.key];
                          const weightPct =
                            totals.totalWeightKg > 0 && metric?.totalWeightKg
                              ? Math.round(
                                  (metric.totalWeightKg / totals.totalWeightKg) * 1000
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
                                  className='h-6 sm:h-7 bg-purple-600 dark:bg-purple-500 rounded-r-md transition-all duration-700 ease-out shadow-xs shrink-0'
                                  style={{
                                    width: `${Math.max(
                                      weightPct > 0 ? weightPct : 0,
                                      (metric?.totalWeightKg || 0) > 0 ? 3 : 0
                                    )}%`,
                                    maxWidth: 'calc(100% - 110px)'
                                  }}
                                />
                                <span className='ml-2 font-bold text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-mono whitespace-nowrap shrink-0'>
                                  {formatNumber(metric?.totalWeightTons || 0)} Tấn
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
                  )}

                  {/* Chart 2: Volume (m³) */}
                  {(chartMetricTab === 'both' || chartMetricTab === 'volume') && (
                    <div className='p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5'>
                      <div className='flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-2'>
                        <div className='flex items-center gap-1.5'>
                          <span className='inline-block w-2.5 h-2.5 rounded-full bg-purple-600' />
                          <span className='font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100'>
                            Thể Tích Hàng Hóa Theo Miền (m³)
                          </span>
                        </div>
                        <span className='text-xs font-mono font-bold text-purple-700 dark:text-purple-300'>
                          Tổng: {formatNumber(totals.totalVolumeCbm)} m³
                        </span>
                      </div>

                      {/* Horizontal Bars */}
                      <div className='space-y-2 pt-1'>
                        {REGION_CONFIGS.map((cfg) => {
                          const metric = data.regions[cfg.key];
                          const volumePct =
                            totals.totalVolumeCbm > 0 && metric?.totalVolumeCbm
                              ? Math.round(
                                  (metric.totalVolumeCbm / totals.totalVolumeCbm) * 1000
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
                                  className='h-6 sm:h-7 bg-purple-600 dark:bg-purple-500 rounded-r-md transition-all duration-700 ease-out shadow-xs shrink-0'
                                  style={{
                                    width: `${Math.max(
                                      volumePct > 0 ? volumePct : 0,
                                      (metric?.totalVolumeCbm || 0) > 0 ? 3 : 0
                                    )}%`,
                                    maxWidth: 'calc(100% - 110px)'
                                  }}
                                />
                                <span className='ml-2 font-bold text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-mono whitespace-nowrap shrink-0'>
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
                  )}
                </div>
              </div>
            )}

            <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='border-b border-slate-200 dark:border-slate-800 bg-slate-100/75 dark:bg-slate-900/75 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider'>
                  <th className='py-2.5 px-3 w-[180px] sm:w-[220px]'>Khu Vực (Vùng Miền)</th>
                  <th className='py-2.5 px-3 min-w-[260px] sm:min-w-[320px]'>
                    Khối Lượng (Kg / Tấn) & Tỷ Trọng
                  </th>
                  <th className='py-2.5 px-3 min-w-[220px] sm:min-w-[280px]'>
                    Thể Tích (m³) & Tỷ Trọng
                  </th>
                  <th className='py-2.5 px-3 w-[150px]'>Số Kiện & Xe</th>
                  <th className='py-2.5 px-3 min-w-[200px]'>Đề Xuất Điều Xe</th>
                  <th className='py-2.5 px-3 w-[90px] text-center'>Thao Tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 dark:divide-slate-800 text-xs'>
                {REGION_CONFIGS.map((cfg) => {
                  const metric = data?.regions?.[cfg.key] || {
                    region: cfg.name,
                    onhandWeightKg: 0,
                    onhandWeightTons: 0,
                    onhandVolumeCbm: 0,
                    onhandPackageCount: 0,
                    onhandOrderCount: 0,
                    incomingWeightKg: 0,
                    incomingWeightTons: 0,
                    incomingVolumeCbm: 0,
                    incomingPackageCount: 0,
                    incomingTripCount: 0,
                    totalWeightKg: 0,
                    totalWeightTons: 0,
                    totalVolumeCbm: 0,
                    recommendedVehicle: 'Chưa đủ sản lượng',
                    quickSnippet: ''
                  };

                  // Calculate percentages relative to max value for visual bar width
                  const weightPct = totals.totalWeightKg > 0
                    ? Math.round((metric.totalWeightKg / totals.totalWeightKg) * 1000) / 10
                    : 0;
                  const weightBarWidth = Math.max(weightPct > 0 ? (metric.totalWeightKg / maxWeightKg) * 100 : 0, metric.totalWeightKg > 0 ? 3 : 0);

                  const volumePct = totals.totalVolumeCbm > 0
                    ? Math.round((metric.totalVolumeCbm / totals.totalVolumeCbm) * 1000) / 10
                    : 0;
                  const volumeBarWidth = Math.max(volumePct > 0 ? (metric.totalVolumeCbm / maxVolumeCbm) * 100 : 0, metric.totalVolumeCbm > 0 ? 3 : 0);

                  const isNA = cfg.key === 'na';

                  return (
                    <tr
                      key={cfg.key}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isNA && metric.totalWeightKg > 0 ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Region Column */}
                      <td className='py-3 px-3 align-top'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-1.5'>
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.dotColor} shrink-0`} />
                            <span className='font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm'>
                              {cfg.name}
                            </span>
                          </div>
                          <p className='text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 pl-4'>
                            {cfg.subtitle}
                          </p>
                          <div className='pl-4 pt-0.5'>
                            <Badge
                              variant='outline'
                              className={`text-[9px] py-0 px-1.5 font-normal ${cfg.badgeBg} ${cfg.badgeBorder}`}
                            >
                              {cfg.key === 'south'
                                ? 'Đã gộp Miền Tây'
                                : isNA
                                ? 'Cần rà soát'
                                : 'Tuyến trục chính'}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Weight Column with Horizontal Bar Chart */}
                      <td className='py-2.5 px-3 align-middle'>
                        <div className='space-y-1.5'>
                          {/* Bar + Value at the tip (exact user reference image style) */}
                          <div className='flex items-center gap-2'>
                            <div className='flex-1 max-w-[160px] sm:max-w-[200px] bg-slate-100 dark:bg-slate-800 rounded h-5 p-0.5 flex overflow-hidden'>
                              <div
                                className={`h-full ${cfg.barColorWeight} rounded-xs transition-all duration-500 ease-out`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(weightBarWidth, metric.totalWeightKg > 0 ? 5 : 0)
                                  )}%`
                                }}
                              />
                            </div>
                            <span className='font-bold text-xs text-purple-700 dark:text-purple-300 font-mono whitespace-nowrap shrink-0'>
                              {formatNumber(metric.totalWeightTons)} Tấn
                              <span className='text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1'>
                                ({weightPct}%)
                              </span>
                            </span>
                          </div>

                          {/* Sub-breakdown: Onhand vs Incoming */}
                          <div className='flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 max-w-[280px]'>
                            <span className='flex items-center gap-1'>
                              <span className='inline-block w-1.5 h-1.5 rounded-full bg-slate-400' />
                              Kho: <strong className='text-slate-700 dark:text-slate-300'>{formatNumber(metric.onhandWeightTons)}T</strong>
                            </span>
                            <span className='flex items-center gap-1'>
                              <span className='inline-block w-1.5 h-1.5 rounded-full bg-purple-500' />
                              Xe về: <strong className='text-purple-700 dark:text-purple-300'>{formatNumber(metric.incomingWeightTons)}T</strong>
                            </span>
                            <span className='font-mono text-slate-400 dark:text-slate-500'>
                              ({formatNumber(metric.totalWeightKg)} kg)
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Volume Column with Horizontal Bar Chart */}
                      <td className='py-2.5 px-3 align-middle'>
                        <div className='space-y-1.5'>
                          {/* Bar + Value at the tip (exact user reference image style) */}
                          <div className='flex items-center gap-2'>
                            <div className='flex-1 max-w-[160px] sm:max-w-[200px] bg-slate-100 dark:bg-slate-800 rounded h-5 p-0.5 flex overflow-hidden'>
                              <div
                                className={`h-full ${cfg.barColorVolume} rounded-xs transition-all duration-500 ease-out`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(volumeBarWidth, metric.totalVolumeCbm > 0 ? 5 : 0)
                                  )}%`
                                }}
                              />
                            </div>
                            <span className='font-bold text-xs text-purple-700 dark:text-purple-300 font-mono whitespace-nowrap shrink-0'>
                              {formatNumber(metric.totalVolumeCbm)} m³
                              <span className='text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1'>
                                ({volumePct}%)
                              </span>
                            </span>
                          </div>

                          {/* Sub-breakdown */}
                          <div className='flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 max-w-[280px]'>
                            <span>Kho: <strong className='text-slate-700 dark:text-slate-300'>{formatNumber(metric.onhandVolumeCbm)} m³</strong></span>
                            <span>Xe về: <strong className='text-purple-700 dark:text-purple-300'>{formatNumber(metric.incomingVolumeCbm)} m³</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* Packages & Trips Column */}
                      <td className='py-3 px-3 align-top text-xs'>
                        <div className='space-y-1'>
                          <div className='flex items-center gap-1 text-slate-800 dark:text-slate-200'>
                            <IconPackage className='h-3.5 w-3.5 text-slate-400' />
                            <strong className='font-semibold'>{formatNumber((metric.onhandPackageCount || 0) + (metric.incomingPackageCount || 0))}</strong> kiện
                          </div>
                          <div className='flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300'>
                            <IconTruck className='h-3.5 w-3.5 text-purple-500' />
                            <span><strong>{formatNumber(metric.incomingTripCount)}</strong> xe sắp về</span>
                          </div>
                          <div className='text-[10px] text-slate-400'>
                            Kho: {formatNumber(metric.onhandOrderCount)} đơn
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Recommendation & Snippet */}
                      <td className='py-3 px-3 align-top'>
                        <div className='space-y-1.5'>
                          <div className='text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight'>
                            {metric.recommendedVehicle}
                          </div>
                          {metric.quickSnippet && (
                            <button
                              onClick={() => handleCopySnippet(cfg.key, metric.quickSnippet)}
                              className='inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline font-medium cursor-pointer'
                            >
                              {copiedKey === cfg.key ? (
                                <>
                                  <IconCheck className='h-3 w-3 text-emerald-600' />
                                  <span className='text-emerald-600 font-bold'>Đã chép tin nhắn</span>
                                </>
                              ) : (
                                <>
                                  <IconCopy className='h-3 w-3' />
                                  <span>Sao chép tin nhắn điều xe</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className='py-3 px-3 align-middle text-center'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() =>
                            setDrilldownRegion({
                              key: cfg.key,
                              name: cfg.name,
                              metric
                            })
                          }
                          className='h-7 w-7 p-0 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded'
                          title={`Xem chi tiết chuyến xe và đơn hàng ${cfg.name}`}
                        >
                          <IconEye className='h-4 w-4' />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Footer Row */}
              <tfoot>
                <tr className='border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/90 font-bold text-slate-900 dark:text-slate-100 text-xs'>
                  <td className='py-3 px-3'>
                    <div className='flex items-center gap-1.5'>
                      <IconBuildingWarehouse className='h-4 w-4 text-purple-600' />
                      <span>TỔNG CỘNG TOÀN QUỐC</span>
                    </div>
                  </td>
                  <td className='py-3 px-3 align-middle'>
                    <div className='flex items-baseline justify-between'>
                      <span className='text-sm text-purple-700 dark:text-purple-300 font-extrabold font-mono'>
                        {formatNumber(totals.totalWeightTons)} Tấn
                      </span>
                      <span className='text-[10px] text-slate-500 font-normal'>
                        Kho: {formatNumber(Math.round(((totals.onhandWeightKg || 0) / 1000) * 100) / 100)}T • Xe: {formatNumber(Math.round(((totals.incomingWeightKg || 0) / 1000) * 100) / 100)}T
                      </span>
                    </div>
                  </td>
                  <td className='py-3 px-3 align-middle'>
                    <span className='text-sm text-purple-700 dark:text-purple-300 font-extrabold font-mono'>
                      {formatNumber(totals.totalVolumeCbm)} m³
                    </span>
                  </td>
                  <td className='py-3 px-3'>
                    <div className='text-slate-800 dark:text-slate-200'>
                      <strong>{formatNumber(totals.packageCount)}</strong> kiện • <strong>{formatNumber(totals.incomingTripCount)}</strong> xe
                    </div>
                  </td>
                  <td className='py-3 px-3' colSpan={2}>
                    <span className='text-[11px] text-slate-500 font-normal'>
                      Khuyến nghị phân bổ theo từng miền tương ứng
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </CardContent>

      {/* Drilldown Modal (Detailed Trips & Onhand Orders per Region) */}
      <Dialog open={!!drilldownRegion} onOpenChange={(open) => !open && setDrilldownRegion(null)}>
        <DialogContent className='sm:max-w-4xl max-h-[85vh] overflow-y-auto p-4'>
          {drilldownRegion && (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center justify-between text-base font-bold'>
                  <div className='flex items-center gap-2'>
                    <span>Chi Tiết Hàng Hóa — {drilldownRegion.name}</span>
                    <Badge variant='outline' className='text-xs'>
                      {formatNumber(drilldownRegion.metric.totalWeightTons)} Tấn • {formatNumber(drilldownRegion.metric.totalVolumeCbm)} m³
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Danh sách chi tiết các chuyến xe đang trung chuyển về kho và các đơn hàng sẵn tại kho
                </DialogDescription>
              </DialogHeader>

              {/* Drilldown Tabs & Search */}
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-b border-slate-200 dark:border-slate-800 pb-2'>
                <div className='flex items-center gap-1.5'>
                  <Button
                    size='sm'
                    variant={drilldownTab === 'incoming' ? 'default' : 'outline'}
                    onClick={() => setDrilldownTab('incoming')}
                    className={`h-7 text-xs ${drilldownTab === 'incoming' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  >
                    <IconTruck className='h-3.5 w-3.5 mr-1' />
                    Xe sắp về ({filteredIncomingTrips.length})
                  </Button>
                  <Button
                    size='sm'
                    variant={drilldownTab === 'onhand' ? 'default' : 'outline'}
                    onClick={() => setDrilldownTab('onhand')}
                    className={`h-7 text-xs ${drilldownTab === 'onhand' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                  >
                    <IconPackage className='h-3.5 w-3.5 mr-1' />
                    Đơn sẵn tại kho ({filteredOnhandOrders.length})
                  </Button>
                </div>

                <div className='relative w-full sm:w-64'>
                  <IconSearch className='h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400' />
                  <Input
                    placeholder='Tìm biển số, mã chuyến, tỉnh...'
                    value={drilldownSearch}
                    onChange={(e) => setDrilldownSearch(e.target.value)}
                    className='h-7 text-xs pl-8'
                  />
                </div>
              </div>

              {/* Drilldown Content */}
              <div className='pt-2'>
                {drilldownTab === 'incoming' ? (
                  filteredIncomingTrips.length === 0 ? (
                    <div className='py-8 text-center text-xs text-slate-400'>
                      Không có chuyến xe nào sắp về thuộc khu vực này.
                    </div>
                  ) : (
                    <div className='overflow-x-auto max-h-[380px] border border-slate-200 dark:border-slate-800 rounded-md'>
                      <table className='w-full text-left text-xs'>
                        <thead className='bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0'>
                          <tr>
                            <th className='py-1.5 px-2.5'>Mã Chuyến</th>
                            <th className='py-1.5 px-2.5'>Biển Số & Tài Xế</th>
                            <th className='py-1.5 px-2.5'>Lộ Trình</th>
                            <th className='py-1.5 px-2.5 text-right'>Khối Lượng</th>
                            <th className='py-1.5 px-2.5 text-right'>Thể Tích</th>
                            <th className='py-1.5 px-2.5 text-right'>Số Kiện</th>
                            <th className='py-1.5 px-2.5'>Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-100 dark:divide-slate-800 text-[11px]'>
                          {filteredIncomingTrips.map((t, idx) => (
                            <tr key={`${t.id}-${idx}`} className='hover:bg-slate-50 dark:hover:bg-slate-800/50'>
                              <td className='py-1.5 px-2.5 font-mono font-bold text-purple-600 dark:text-purple-400'>
                                {t.tripCode}
                              </td>
                              <td className='py-1.5 px-2.5'>
                                <div><strong className='font-semibold'>{t.licensePlate || '—'}</strong></div>
                                <div className='text-[10px] text-slate-400'>{t.driverName || 'Chưa gán tài xế'}</div>
                              </td>
                              <td className='py-1.5 px-2.5'>
                                <div>{t.originHubName} → {t.destinationHubName}</div>
                                {t.province && (
                                  <div className='text-[10px] text-slate-400'>Tỉnh đích: {t.province}</div>
                                )}
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-medium'>
                                {formatNumber(t.weightTons)} T ({formatNumber(t.weightKg)} kg)
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-medium'>
                                {formatNumber(t.volumeCbm)} m³
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-bold text-slate-700 dark:text-slate-300'>
                                {formatNumber(t.packageCount)}
                              </td>
                              <td className='py-1.5 px-2.5'>
                                <Badge variant='outline' className='text-[9px] py-0 px-1 border-blue-300 text-blue-700 bg-blue-50'>
                                  {t.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  filteredOnhandOrders.length === 0 ? (
                    <div className='py-8 text-center text-xs text-slate-400'>
                      Không có đơn hàng tồn kho nào thuộc khu vực này.
                    </div>
                  ) : (
                    <div className='overflow-x-auto max-h-[380px] border border-slate-200 dark:border-slate-800 rounded-md'>
                      <table className='w-full text-left text-xs'>
                        <thead className='bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 sticky top-0'>
                          <tr>
                            <th className='py-1.5 px-2.5'>Mã Vận Đơn</th>
                            <th className='py-1.5 px-2.5'>Tỉnh Thành</th>
                            <th className='py-1.5 px-2.5'>Kho Lưu Hiện Tại</th>
                            <th className='py-1.5 px-2.5 text-right'>Số Kiện Tồn</th>
                            <th className='py-1.5 px-2.5 text-right'>Khối Lượng</th>
                            <th className='py-1.5 px-2.5 text-right'>Thể Tích</th>
                            <th className='py-1.5 px-2.5'>Mô Tả Hàng</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-100 dark:divide-slate-800 text-[11px]'>
                          {filteredOnhandOrders.map((o) => (
                            <tr key={o.id} className='hover:bg-slate-50 dark:hover:bg-slate-800/50'>
                              <td className='py-1.5 px-2.5 font-mono font-bold text-slate-800 dark:text-slate-200'>
                                {o.orderCode}
                              </td>
                              <td className='py-1.5 px-2.5'>
                                <Badge variant='outline' className='text-[9px] py-0 px-1.5'>
                                  {o.province || 'N/A'}
                                </Badge>
                              </td>
                              <td className='py-1.5 px-2.5 text-slate-600 dark:text-slate-400'>
                                {o.currentHubName}
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400'>
                                {formatNumber(o.remainingQuantity)} / {formatNumber(o.totalQuantity)}
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-medium'>
                                {formatNumber(o.weightTons)} T ({formatNumber(o.weightKg)} kg)
                              </td>
                              <td className='py-1.5 px-2.5 text-right font-medium'>
                                {formatNumber(o.volumeCbm)} m³
                              </td>
                              <td className='py-1.5 px-2.5 text-[10px] text-slate-500 max-w-[150px] truncate'>
                                {o.goodsDescription || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
