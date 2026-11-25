'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconDownload, IconLoader2, IconRefresh } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { formatApiError } from '@/lib/api-error';
import { formatNumber } from '@/lib/utils';
import { useAdminOperationalReport } from './super-admin-operational-report';

type RegionKey = 'north' | 'central' | 'south' | 'storage' | 'na';
type CargoStatus = 'onhand' | 'draft' | 'total';

export interface RegionalMetricItem {
  region: string;
  onhandWeightKg: number;
  onhandVolumeCbm: number;
  onhandPackageCount: number;
  onhandOrderCount: number;
  onhandOrderCodes: string[];
  draftWeightKg: number;
  draftVolumeCbm: number;
  draftOrderCount: number;
  draftOrderCodes: string[];
}

export interface RegionalHubReport {
  hub: { id: number; code: string; name: string; level: number };
  hasSnapshot: boolean;
  reportDate: string | null;
  calculatedAt: string | null;
  regions: Record<RegionKey, RegionalMetricItem> | null;
}

export interface RegionalReportApiResponse {
  hubReports: RegionalHubReport[];
  cronInfo: {
    cronTime: string;
    lastRunAt: string | null;
    lastRunStatus: string;
  };
}

const REGION_CONFIGS: Array<{ key: RegionKey; label: string; color: string; draftColor: string }> = [
  { key: 'north', label: 'MIỀN BẮC', color: '#2563EB', draftColor: '#93C5FD' },
  { key: 'central', label: 'MIỀN TRUNG', color: '#F97316', draftColor: '#FDBA74' },
  { key: 'south', label: 'MIỀN NAM', color: '#7C3AED', draftColor: '#C4B5FD' },
  { key: 'storage', label: 'LƯU KHO', color: '#059669', draftColor: '#6EE7B7' },
  { key: 'na', label: 'CHƯA XÁC ĐỊNH MIỀN', color: '#64748B', draftColor: '#CBD5E1' },
];

function formatSnapshotTime(value: string | null): string {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function metricForStatus(metric: RegionalMetricItem, status: CargoStatus) {
  const onhand = status !== 'draft';
  const draft = status !== 'onhand';
  const codes = [
    ...(onhand ? metric.onhandOrderCodes : []),
    ...(draft ? metric.draftOrderCodes : []),
  ];
  return {
    weightKg: (onhand ? metric.onhandWeightKg : 0) + (draft ? metric.draftWeightKg : 0),
    volumeCbm: (onhand ? metric.onhandVolumeCbm : 0) + (draft ? metric.draftVolumeCbm : 0),
    orderCount: new Set(codes).size,
    orderCodes: [...new Set(codes)],
  };
}

function RegionalHubPanel({ report, status }: { report: RegionalHubReport; status: CargoStatus }) {
  const rows = REGION_CONFIGS.map((config) => {
    const metric = report.regions?.[config.key];
    const selected = metric ? metricForStatus(metric, status) : null;
    return {
      ...config,
      metric,
      selected,
      onhandTons: status === 'draft' ? 0 : (metric?.onhandWeightKg ?? 0) / 1000,
      draftTons: status === 'onhand' ? 0 : (metric?.draftWeightKg ?? 0) / 1000,
      onhandVolume: status === 'draft' ? 0 : (metric?.onhandVolumeCbm ?? 0),
      draftVolume: status === 'onhand' ? 0 : (metric?.draftVolumeCbm ?? 0),
      onhandWeightPercent: 0,
      draftWeightPercent: 0,
      onhandVolumePercent: 0,
      draftVolumePercent: 0,
    };
  });
  const totalWeightKg = rows.reduce((sum, row) => sum + (row.selected?.weightKg ?? 0), 0);
  const totalVolumeCbm = rows.reduce((sum, row) => sum + (row.selected?.volumeCbm ?? 0), 0);
  for (const row of rows) {
    row.onhandWeightPercent = totalWeightKg > 0 ? row.onhandTons * 100_000 / totalWeightKg : 0;
    row.draftWeightPercent = totalWeightKg > 0 ? row.draftTons * 100_000 / totalWeightKg : 0;
    row.onhandVolumePercent = totalVolumeCbm > 0 ? row.onhandVolume * 100 / totalVolumeCbm : 0;
    row.draftVolumePercent = totalVolumeCbm > 0 ? row.draftVolume * 100 / totalVolumeCbm : 0;
  }

  return (
    <section className='border border-slate-200 dark:border-slate-800 rounded-md' data-testid={`regional-hub-${report.hub.id}`}>
      <div className='p-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900'>
        <div className='flex items-center gap-2 min-w-0'>
          <strong className='text-xs text-blue-700 dark:text-blue-300 truncate'>{report.hub.name}</strong>
          <span className='text-[10px] text-slate-500 font-mono'>{report.hub.code}</span>
        </div>
        <span className='text-[10px] text-slate-600 dark:text-slate-300' data-testid='regional-calculated-at'>
          Chốt: {formatSnapshotTime(report.calculatedAt)}
        </span>
      </div>

      {!report.hasSnapshot || !report.regions ? (
        <p className='p-2 text-xs text-slate-500'>Chưa có số liệu chốt cho hub này.</p>
      ) : (
        <div className='p-1.5 space-y-2'>
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-2'>
            <div className='border border-slate-200 dark:border-slate-800 rounded-md p-1.5' data-testid='regional-weight-chart'>
              <div className='flex items-center justify-between gap-2 text-xs'>
                <strong>Khối lượng theo miền giao (tấn)</strong>
                <span data-testid='regional-weight-total' className='font-mono font-bold'>Tổng: {formatNumber(totalWeightKg / 1000)} tấn</span>
              </div>
              <div className='h-44'>
                <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 320, height: 176 }}>
                  <BarChart data={rows} layout='vertical' margin={{ top: 3, right: 4, bottom: 3, left: 4 }}>
                    <CartesianGrid strokeDasharray='3 3' horizontal={false} />
                    <XAxis type='number' domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => String(value) + '%'} tick={{ fontSize: 10 }} />
                    <YAxis type='category' dataKey='label' width={130} tick={{ fontSize: 10 }} />
                    {status !== 'draft' && (
                      <Bar dataKey='onhandWeightPercent' name='Hàng tại kho' stackId='weight' isAnimationActive={false}>
                        {rows.map((row) => <Cell key={row.key} fill={row.color} />)}
                        <LabelList
                          dataKey='onhandTons'
                          position='inside'
                          formatter={(value) => formatNumber(Number(value))}
                          style={{ fontSize: 9, fontWeight: 700, fill: '#0F172A', stroke: '#FFFFFF', strokeWidth: 2, paintOrder: 'stroke' }}
                        />
                      </Bar>
                    )}
                    {status !== 'onhand' && (
                      <Bar dataKey='draftWeightPercent' name='Dự kiến nhập kho' stackId='weight' isAnimationActive={false}>
                        {rows.map((row) => <Cell key={row.key} fill={row.draftColor} />)}
                        <LabelList
                          dataKey='draftTons'
                          position='inside'
                          formatter={(value) => formatNumber(Number(value))}
                          style={{ fontSize: 9, fontWeight: 700, fill: '#0F172A', stroke: '#FFFFFF', strokeWidth: 2, paintOrder: 'stroke' }}
                        />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className='border border-slate-200 dark:border-slate-800 rounded-md p-1.5' data-testid='regional-volume-chart'>
              <div className='flex items-center justify-between gap-2 text-xs'>
                <strong>Thể tích theo miền giao (m³)</strong>
                <span data-testid='regional-volume-total' className='font-mono font-bold'>Tổng: {formatNumber(totalVolumeCbm)} m³</span>
              </div>
              <div className='h-44'>
                <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 320, height: 176 }}>
                  <BarChart data={rows} layout='vertical' margin={{ top: 3, right: 4, bottom: 3, left: 4 }}>
                    <CartesianGrid strokeDasharray='3 3' horizontal={false} />
                    <XAxis type='number' domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => String(value) + '%'} tick={{ fontSize: 10 }} />
                    <YAxis type='category' dataKey='label' width={130} tick={{ fontSize: 10 }} />
                    {status !== 'draft' && (
                      <Bar dataKey='onhandVolumePercent' name='Hàng tại kho' stackId='volume' isAnimationActive={false}>
                        {rows.map((row) => <Cell key={row.key} fill={row.color} />)}
                        <LabelList
                          dataKey='onhandVolume'
                          position='inside'
                          formatter={(value) => formatNumber(Number(value))}
                          style={{ fontSize: 9, fontWeight: 700, fill: '#0F172A', stroke: '#FFFFFF', strokeWidth: 2, paintOrder: 'stroke' }}
                        />
                      </Bar>
                    )}
                    {status !== 'onhand' && (
                      <Bar dataKey='draftVolumePercent' name='Dự kiến nhập kho' stackId='volume' isAnimationActive={false}>
                        {rows.map((row) => <Cell key={row.key} fill={row.draftColor} />)}
                        <LabelList
                          dataKey='draftVolume'
                          position='inside'
                          formatter={(value) => formatNumber(Number(value))}
                          style={{ fontSize: 9, fontWeight: 700, fill: '#0F172A', stroke: '#FFFFFF', strokeWidth: 2, paintOrder: 'stroke' }}
                        />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}

export function SuperAdminRegionalDispatchTable() {
  const queryClient = useQueryClient();
  const { selectedHubId } = useAdminOperationalReport();
  const [status, setStatus] = useState<CargoStatus>('total');
  const { data: report, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-regional-dispatch-report-table', selectedHubId],
    queryFn: async () => {
      const response = await apiClient.get<RegionalReportApiResponse | { data: RegionalReportApiResponse }>(
        '/api/v1/admin/reports/regional-dispatch',
        { params: { hubId: selectedHubId } },
      );
      const payload = response.data;
      return 'data' in payload ? payload.data : payload;
    },
    staleTime: 60_000,
  });
  const sync = useMutation({
    mutationFn: () => apiClient.post('/api/v1/admin/reports/regional-dispatch/sync', {
      hubId: selectedHubId === 'ALL' ? undefined : Number(selectedHubId),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-regional-dispatch-report-table'] });
      toast.success('Đã cập nhật tình hình hàng hóa.');
    },
    onError: (cause: unknown) => toast.error(formatApiError(cause)),
  });

  const exportExcel = () => {
    if (!report) return;
    const rows = report.hubReports.flatMap((hubReport) => {
      if (!hubReport.regions) return [];
      return REGION_CONFIGS.map((config) => {
        const metric = hubReport.regions![config.key];
        return {
          Hub: hubReport.hub.name,
          'Ngày chốt': hubReport.reportDate ?? '',
          'Thời điểm tính': formatSnapshotTime(hubReport.calculatedAt),
          'Miền giao': config.label,
          'Mã đơn tại kho': metric.onhandOrderCodes.join(', '),
          'Số kiện tại kho': metric.onhandPackageCount,
          'Kg tại kho': metric.onhandWeightKg,
          'm³ tại kho': metric.onhandVolumeCbm,
          'Mã đơn dự kiến nhập': metric.draftOrderCodes.join(', '),
          'Kg dự kiến nhập': metric.draftWeightKg,
          'm³ dự kiến nhập': metric.draftVolumeCbm,
        };
      });
    });
    if (rows.length === 0) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Tinh_hinh_hang_hoa');
    XLSX.writeFile(workbook, `Tinh_hinh_hang_hoa_${selectedHubId}.xlsx`);
  };

  return (
    <Card className='border border-slate-200 dark:border-slate-800'>
      <div className='p-1.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-sm font-bold'>Tình hình hàng hóa</h3>
          <p className='text-[10px] text-slate-500'>Chốt số liệu tự động lúc {report?.cronInfo.cronTime ?? '06:00'} hằng ngày · Chỉ Cấp 1 • Hub Chính</p>
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <Button variant='outline' size='sm' className='h-8 text-xs' onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className='h-3.5 w-3.5' /> Làm mới
          </Button>
          <Button variant='outline' size='sm' className='h-8 text-xs' onClick={exportExcel} disabled={!report?.hubReports.some((hub) => hub.hasSnapshot)}>
            <IconDownload className='h-3.5 w-3.5' /> Xuất Excel
          </Button>
          <Button size='sm' className='h-8 text-xs' onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <IconLoader2 className='h-3.5 w-3.5 animate-spin' /> : <IconRefresh className='h-3.5 w-3.5' />}
            Đồng bộ số liệu
          </Button>
        </div>
      </div>
      <CardContent className='p-1.5 space-y-2'>
        <div role='group' aria-label='Trạng thái đơn hàng' className='flex flex-wrap gap-1'>
          {([['onhand', 'Hàng tại kho'], ['draft', 'Dự kiến nhập kho'], ['total', 'Tất cả']] as const).map(([value, label]) => (
            <button key={value} type='button' aria-pressed={status === value} onClick={() => setStatus(value)}
              className={`h-8 px-2 text-xs rounded border cursor-pointer ${status === value ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className='text-[10px] text-slate-500'>Hàng tại kho được chia theo tỉnh giao. Dòng LƯU KHO gồm đơn ghi “Lưu kho” ở tỉnh giao.</p>
        {isLoading ? (
          <p className='p-2 text-xs text-slate-500'>Đang tải số liệu chốt...</p>
        ) : error ? (
          <p className='p-2 text-xs text-rose-700'>{formatApiError(error)}</p>
        ) : !report?.hubReports.length ? (
          <p className='p-2 text-xs text-slate-500'>Chưa có Hub Chính cấp 1.</p>
        ) : (
          report.hubReports.map((hubReport) => <RegionalHubPanel key={hubReport.hub.id} report={hubReport} status={status} />)
        )}
      </CardContent>
    </Card>
  );
}
