'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuildingWarehouse,
  IconCalendar,
  IconCheck,
  IconClock,
  IconCopy,
  IconDownload,
  IconLoader2,
  IconPackage,
  IconRefresh,
  IconSearch,
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

export function SuperAdminRegionalDispatch() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'CARDS' | 'INCOMING' | 'ONHAND'>('CARDS');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedRegion, setCopiedRegion] = useState<string | null>(null);

  // Fetch dữ liệu báo cáo
  const { data, isLoading, isError, refetch } = useQuery<RegionalReportApiResponse>({
    queryKey: ['admin-regional-dispatch-report', selectedHubId, selectedDate],
    queryFn: async () => {
      const res = await apiClient.get<
        RegionalReportApiResponse | { data: RegionalReportApiResponse }
      >(
        `/api/v1/admin/reports/regional-dispatch?hubId=${selectedHubId}&date=${selectedDate}&mode=live`
      );
      const raw = res.data as { data?: RegionalReportApiResponse } &
        RegionalReportApiResponse;
      const resolved = raw?.data ?? raw;
      return resolved;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Gọi thủ công đồng bộ snapshot từ Cronjob service
  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      await apiClient.post('/api/v1/admin/reports/regional-dispatch/sync', {
        hubId: selectedHubId !== 'ALL' ? Number(selectedHubId) : undefined,
        date: selectedDate
      });
      await refetch();
      toast.success('Đã cập nhật snapshot cân đối tải trọng mới nhất!');
    } catch {
      toast.error('Lỗi khi kích hoạt tính toán snapshot');
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy đoạn tin nhắn gửi Đội xe (Zalo/Telegram)
  const handleCopySnippet = (snippetText: string, regionTitle: string) => {
    if (!snippetText) return;
    navigator.clipboard.writeText(snippetText);
    setCopiedRegion(regionTitle);
    toast.success(`Đã copy nội dung gửi Zalo/Telegram Đội xe ${regionTitle}!`);
    setTimeout(() => setCopiedRegion(null), 2500);
  };

  // Xuất file Excel báo cáo
  const handleExportExcel = () => {
    if (!data || !data.regions) return;

    const summaryRows = [
      {
        'Miền vận chuyển': 'MIỀN BẮC',
        'Tồn kho (Tấn)': data.regions.north.onhandWeightTons,
        'Tồn kho (Kiện)': data.regions.north.onhandPackageCount,
        'Tồn kho (m³)': data.regions.north.onhandVolumeCbm,
        'Sắp về (Tấn)': data.regions.north.incomingWeightTons,
        'Số xe đang về': data.regions.north.incomingTripCount,
        'Tổng tải dự kiến (Tấn)': data.regions.north.totalWeightTons,
        'Tổng tải dự kiến (m³)': data.regions.north.totalVolumeCbm,
        'Đề xuất loại xe': data.regions.north.recommendedVehicle
      },
      {
        'Miền vận chuyển': 'MIỀN TRUNG',
        'Tồn kho (Tấn)': data.regions.central.onhandWeightTons,
        'Tồn kho (Kiện)': data.regions.central.onhandPackageCount,
        'Tồn kho (m³)': data.regions.central.onhandVolumeCbm,
        'Sắp về (Tấn)': data.regions.central.incomingWeightTons,
        'Số xe đang về': data.regions.central.incomingTripCount,
        'Tổng tải dự kiến (Tấn)': data.regions.central.totalWeightTons,
        'Tổng tải dự kiến (m³)': data.regions.central.totalVolumeCbm,
        'Đề xuất loại xe': data.regions.central.recommendedVehicle
      },
      {
        'Miền vận chuyển': 'MIỀN NAM (Gồm Miền Tây)',
        'Tồn kho (Tấn)': data.regions.south.onhandWeightTons,
        'Tồn kho (Kiện)': data.regions.south.onhandPackageCount,
        'Tồn kho (m³)': data.regions.south.onhandVolumeCbm,
        'Sắp về (Tấn)': data.regions.south.incomingWeightTons,
        'Số xe đang về': data.regions.south.incomingTripCount,
        'Tổng tải dự kiến (Tấn)': data.regions.south.totalWeightTons,
        'Tổng tải dự kiến (m³)': data.regions.south.totalVolumeCbm,
        'Đề xuất loại xe': data.regions.south.recommendedVehicle
      },
      {
        'Miền vận chuyển': 'CHƯA PHÂN MIỀN (N/A)',
        'Tồn kho (Tấn)': data.regions.na.onhandWeightTons,
        'Tồn kho (Kiện)': data.regions.na.onhandPackageCount,
        'Tồn kho (m³)': data.regions.na.onhandVolumeCbm,
        'Sắp về (Tấn)': data.regions.na.incomingWeightTons,
        'Số xe đang về': data.regions.na.incomingTripCount,
        'Tổng tải dự kiến (Tấn)': data.regions.na.totalWeightTons,
        'Tổng tải dự kiến (m³)': data.regions.na.totalVolumeCbm,
        'Đề xuất loại xe': data.regions.na.recommendedVehicle
      }
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Tai_Trong_Mien');

    if (data.onhandOrdersList?.length > 0) {
      const ordersData = data.onhandOrdersList.map((ord) => ({
        'Mã đơn': ord.orderCode,
        'Tỉnh/Thành': ord.province,
        'Miền': ord.region,
        'Số kiện tồn': ord.remainingQuantity,
        'Khối lượng (Kg)': ord.weightKg,
        'Khối lượng (Tấn)': ord.weightTons,
        'Thể tích (m³)': ord.volumeCbm,
        'Diễn giải hàng': ord.goodsDescription || '',
        'Kho hiện tại': ord.currentHubName
      }));
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Hang_Ton_Kho_Chi_Tiet');
    }

    if (data.incomingTripsList?.length > 0) {
      const tripsData = data.incomingTripsList.map((tr) => ({
        'Mã chuyến (TRIP)': tr.tripCode,
        'Biển số xe': tr.licensePlate,
        'Tài xế': tr.driverName,
        'Kho gửi': tr.originHubName,
        'Kho nhận': tr.destinationHubName,
        'Trọng lượng (Tấn)': tr.weightTons,
        'Thể tích (m³)': tr.volumeCbm,
        'Kiện': tr.packageCount,
        'Mã đơn đi kèm': tr.orderCode,
        'Tỉnh giao': tr.province,
        'Miền': tr.region,
        'Trạng thái': tr.status
      }));
      const wsTrips = XLSX.utils.json_to_sheet(tripsData);
      XLSX.utils.book_append_sheet(wb, wsTrips, 'Xe_Dang_Ve_Kho');
    }

    XLSX.writeFile(wb, `Can_Doi_Tai_Trong_Doi_Xe_${selectedDate}.xlsx`);
    toast.success('Đã xuất file Excel thành công!');
  };

  // Lọc danh sách đơn tồn kho theo search và tab miền
  const filteredOnhandOrders = useMemo(() => {
    if (!data?.onhandOrdersList) return [];
    return data.onhandOrdersList.filter((ord) => {
      const matchRegion = regionFilter === 'ALL' || ord.region === regionFilter;
      const matchSearch =
        !searchKeyword.trim() ||
        ord.orderCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        ord.province.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (ord.goodsDescription && ord.goodsDescription.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchRegion && matchSearch;
    });
  }, [data?.onhandOrdersList, regionFilter, searchKeyword]);

  // Lọc danh sách chuyến xe đang về
  const filteredIncomingTrips = useMemo(() => {
    if (!data?.incomingTripsList) return [];
    return data.incomingTripsList.filter((trip) => {
      const matchRegion = regionFilter === 'ALL' || trip.region === regionFilter;
      const matchSearch =
        !searchKeyword.trim() ||
        trip.tripCode.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        trip.licensePlate.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        trip.driverName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        trip.province.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [data?.incomingTripsList, regionFilter, searchKeyword]);

  return (
    <div className='flex flex-col gap-2 p-1.5 md:p-2'>
      {/* ── HEADER TOOLBAR ────────────────────────────────────── */}
      <div className='flex flex-wrap items-center justify-between gap-1.5 rounded-md border bg-card p-1.5 shadow-xs'>
        <div className='flex items-center gap-2'>
          <Link href='/dashboard/admin/reports'>
            <Button variant='ghost' size='sm' className='h-8 px-2'>
              <IconArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-1.5'>
              <h1 className='text-sm font-bold tracking-tight text-foreground md:text-base'>
                Cân Đối Tải Trọng Đội Xe Theo Miền
              </h1>
              <Badge variant='outline' className='border-blue-300 bg-blue-50 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'>
                Super Admin Only
              </Badge>
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Tổng hợp sản lượng Tồn kho & Hàng sắp về theo 3 Miền (Bắc - Trung - Nam) phục vụ điều xe
            </p>
          </div>
        </div>

        {/* BỘ LỌC KHO, NGÀY & NÚT ĐỒNG BỘ */}
        <div className='flex flex-wrap items-center gap-1.5'>
          {/* Lọc Hub */}
          <div className='flex items-center gap-1'>
            <IconBuildingWarehouse className='h-3.5 w-3.5 text-muted-foreground' />
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(e.target.value)}
              className='h-8 rounded-md border bg-background px-2 text-[11px] font-medium focus:ring-1 focus:ring-primary'
            >
              <option value='ALL'>Tất cả Chi nhánh (Toàn quốc)</option>
              {data?.hubsList?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.level === 1 ? '🟦 ' : '🟪 '}
                  {h.name} ({h.level === 1 ? 'Hub Cấp 1' : 'Trạm Xe Bo Cấp 2'})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn ngày */}
          <div className='flex items-center gap-1'>
            <IconCalendar className='h-3.5 w-3.5 text-muted-foreground' />
            <input
              type='date'
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='h-8 rounded-md border bg-background px-1.5 text-[11px] font-medium'
            />
          </div>

          {/* Nút Đồng bộ snapshot Cronjob */}
          <Button
            variant='outline'
            size='sm'
            onClick={handleSyncNow}
            disabled={isSyncing}
            className='h-8 gap-1 text-[11px]'
          >
            {isSyncing ? (
              <IconLoader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <IconRefresh className='h-3.5 w-3.5' />
            )}
            Đồng bộ ngay
          </Button>

          {/* Nút Xuất Excel */}
          <Button
            variant='default'
            size='sm'
            onClick={handleExportExcel}
            className='h-8 gap-1 bg-emerald-600 text-[11px] hover:bg-emerald-700 text-white'
          >
            <IconDownload className='h-3.5 w-3.5' />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* THÔNG TIN CHU KỲ CRONJOB */}
      {data?.cronInfo && (
        <div className='flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground'>
          <div className='flex items-center gap-1.5'>
            <IconClock className='h-3 w-3 text-primary' />
            <span>
              Cronjob định kỳ tự động:{' '}
              <strong className='text-foreground'>{data.cronInfo.cronTime} hàng ngày</strong> (Khung giờ chốt tải trước ca đêm)
            </span>
          </div>
          <div>
            Trạng thái:{' '}
            <span className='font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
              {data.cronInfo.lastRunStatus === 'SUCCESS' ? 'Hoạt động bình thường' : 'Sẵn sàng'}
            </span>
            {data.cronInfo.lastRunAt && (
              <span className='ml-2 text-muted-foreground'>
                (Lần chạy gần nhất: {new Date(data.cronInfo.lastRunAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        </div>
      )}

      {/* LOADING / ERROR STATE */}
      {isLoading && (
        <div className='flex items-center justify-center p-8 text-xs text-muted-foreground'>
          <IconLoader2 className='mr-2 h-5 w-5 animate-spin' /> Đang tính toán dữ liệu cân đối tải trọng các miền...
        </div>
      )}

      {isError && (
        <div className='flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300'>
          <IconAlertTriangle className='h-4 w-4 shrink-0' />
          Không thể tải dữ liệu báo cáo. Vui lòng kiểm tra lại quyền Super Admin hoặc kết nối mạng.
        </div>
      )}

      {/* ── NỘI DUNG CHÍNH (3 CARDS MIỀN + CHI TIẾT) ────────────────── */}
      {data && data.regions && (
        <>
          {/* 3 THẺ TẢI TRỌNG NỔI BẬT */}
          <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
            {/* 🟦 MIỀN BẮC */}
            <Card className='border-l-4 border-l-blue-600 shadow-xs'>
              <CardContent className='flex flex-col justify-between p-2'>
                <div>
                  <div className='flex items-center justify-between border-b pb-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='h-2.5 w-2.5 rounded-full bg-blue-600'></span>
                      <h3 className='text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300'>
                        MIỀN BẮC (Đội Tuyến Bắc)
                      </h3>
                    </div>
                    <Badge variant='outline' className='border-blue-300 bg-blue-50 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300'>
                      25 Tỉnh/Thành
                    </Badge>
                  </div>

                  {/* Số liệu Tồn kho & Sắp về */}
                  <div className='my-1.5 space-y-1 text-[11px]'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sẵn tại kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.north.onhandWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({formatNumber(data.regions.north.onhandPackageCount)} kiện • {data.regions.north.onhandVolumeCbm} m³)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sắp về kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.north.incomingWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({data.regions.north.incomingTripCount} xe đang về)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between rounded bg-blue-50/70 p-1 dark:bg-blue-950/40'>
                      <span className='font-bold text-blue-900 dark:text-blue-200'>TỔNG TẢI DỰ KIẾN:</span>
                      <span className='text-xs font-black text-blue-700 dark:text-blue-400'>
                        {data.regions.north.totalWeightTons} TẤN{' '}
                        <span className='text-[10px] font-normal text-muted-foreground'>
                          ({data.regions.north.totalVolumeCbm} m³)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Đề xuất xe */}
                  <div className='rounded border border-blue-200/60 bg-white/60 p-1 text-[10px] text-blue-800 dark:border-blue-900/60 dark:bg-slate-900 dark:text-blue-300'>
                    🚚 <strong className='font-medium'>Đề xuất xe:</strong> {data.regions.north.recommendedVehicle}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className='mt-2 flex items-center justify-between pt-1 border-t'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setRegionFilter('MIỀN BẮC');
                      setActiveTab('ONHAND');
                    }}
                    className='h-7 px-2 text-[10px]'
                  >
                    Xem {data.regions.north.onhandOrderCount} đơn kho
                  </Button>

                  <Button
                    variant='default'
                    size='sm'
                    onClick={() => handleCopySnippet(data.regions.north.quickSnippet, 'Miền Bắc')}
                    className='h-7 gap-1 bg-blue-600 px-2 text-[10px] hover:bg-blue-700 text-white'
                  >
                    {copiedRegion === 'Miền Bắc' ? (
                      <IconCheck className='h-3 w-3' />
                    ) : (
                      <IconCopy className='h-3 w-3' />
                    )}
                    {copiedRegion === 'Miền Bắc' ? 'Đã copy' : 'Copy gửi Đội Xe'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 🟧 MIỀN TRUNG */}
            <Card className='border-l-4 border-l-amber-500 shadow-xs'>
              <CardContent className='flex flex-col justify-between p-2'>
                <div>
                  <div className='flex items-center justify-between border-b pb-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='h-2.5 w-2.5 rounded-full bg-amber-500'></span>
                      <h3 className='text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300'>
                        MIỀN TRUNG (Đội Tuyến Trung)
                      </h3>
                    </div>
                    <Badge variant='outline' className='border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-300'>
                      19 Tỉnh/Thành
                    </Badge>
                  </div>

                  {/* Số liệu Tồn kho & Sắp về */}
                  <div className='my-1.5 space-y-1 text-[11px]'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sẵn tại kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.central.onhandWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({formatNumber(data.regions.central.onhandPackageCount)} kiện • {data.regions.central.onhandVolumeCbm} m³)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sắp về kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.central.incomingWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({data.regions.central.incomingTripCount} xe đang về)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between rounded bg-amber-50/70 p-1 dark:bg-amber-950/40'>
                      <span className='font-bold text-amber-900 dark:text-amber-200'>TỔNG TẢI DỰ KIẾN:</span>
                      <span className='text-xs font-black text-amber-700 dark:text-amber-400'>
                        {data.regions.central.totalWeightTons} TẤN{' '}
                        <span className='text-[10px] font-normal text-muted-foreground'>
                          ({data.regions.central.totalVolumeCbm} m³)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Đề xuất xe */}
                  <div className='rounded border border-amber-200/60 bg-white/60 p-1 text-[10px] text-amber-800 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-300'>
                    🚚 <strong className='font-medium'>Đề xuất xe:</strong> {data.regions.central.recommendedVehicle}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className='mt-2 flex items-center justify-between pt-1 border-t'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setRegionFilter('MIỀN TRUNG');
                      setActiveTab('ONHAND');
                    }}
                    className='h-7 px-2 text-[10px]'
                  >
                    Xem {data.regions.central.onhandOrderCount} đơn kho
                  </Button>

                  <Button
                    variant='default'
                    size='sm'
                    onClick={() => handleCopySnippet(data.regions.central.quickSnippet, 'Miền Trung')}
                    className='h-7 gap-1 bg-amber-600 px-2 text-[10px] hover:bg-amber-700 text-white'
                  >
                    {copiedRegion === 'Miền Trung' ? (
                      <IconCheck className='h-3 w-3' />
                    ) : (
                      <IconCopy className='h-3 w-3' />
                    )}
                    {copiedRegion === 'Miền Trung' ? 'Đã copy' : 'Copy gửi Đội Xe'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 🟪 MIỀN NAM (GỒM MIỀN TÂY) */}
            <Card className='border-l-4 border-l-purple-600 shadow-xs'>
              <CardContent className='flex flex-col justify-between p-2'>
                <div>
                  <div className='flex items-center justify-between border-b pb-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='h-2.5 w-2.5 rounded-full bg-purple-600'></span>
                      <h3 className='text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300'>
                        MIỀN NAM (Đông & Tây Nam Bộ)
                      </h3>
                    </div>
                    <Badge variant='outline' className='border-purple-300 bg-purple-50 text-[10px] text-purple-700 dark:bg-purple-950 dark:text-purple-300'>
                      19 Tỉnh/Thành
                    </Badge>
                  </div>

                  {/* Số liệu Tồn kho & Sắp về */}
                  <div className='my-1.5 space-y-1 text-[11px]'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sẵn tại kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.south.onhandWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({formatNumber(data.regions.south.onhandPackageCount)} kiện • {data.regions.south.onhandVolumeCbm} m³)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Hàng sắp về kho:</span>
                      <span className='font-semibold text-foreground'>
                        {data.regions.south.incomingWeightTons} Tấn{' '}
                        <span className='text-[10px] text-muted-foreground'>
                          ({data.regions.south.incomingTripCount} xe đang về)
                        </span>
                      </span>
                    </div>

                    <div className='flex items-center justify-between rounded bg-purple-50/70 p-1 dark:bg-purple-950/40'>
                      <span className='font-bold text-purple-900 dark:text-purple-200'>TỔNG TẢI DỰ KIẾN:</span>
                      <span className='text-xs font-black text-purple-700 dark:text-purple-400'>
                        {data.regions.south.totalWeightTons} TẤN{' '}
                        <span className='text-[10px] font-normal text-muted-foreground'>
                          ({data.regions.south.totalVolumeCbm} m³)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Đề xuất xe */}
                  <div className='rounded border border-purple-200/60 bg-white/60 p-1 text-[10px] text-purple-800 dark:border-purple-900/60 dark:bg-slate-900 dark:text-purple-300'>
                    🚚 <strong className='font-medium'>Đề xuất xe:</strong> {data.regions.south.recommendedVehicle}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className='mt-2 flex items-center justify-between pt-1 border-t'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setRegionFilter('MIỀN NAM');
                      setActiveTab('ONHAND');
                    }}
                    className='h-7 px-2 text-[10px]'
                  >
                    Xem {data.regions.south.onhandOrderCount} đơn kho
                  </Button>

                  <Button
                    variant='default'
                    size='sm'
                    onClick={() => handleCopySnippet(data.regions.south.quickSnippet, 'Miền Nam')}
                    className='h-7 gap-1 bg-purple-600 px-2 text-[10px] hover:bg-purple-700 text-white'
                  >
                    {copiedRegion === 'Miền Nam' ? (
                      <IconCheck className='h-3 w-3' />
                    ) : (
                      <IconCopy className='h-3 w-3' />
                    )}
                    {copiedRegion === 'Miền Nam' ? 'Đã copy' : 'Copy gửi Đội Xe'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CẢNH BÁO N/A NẾU CÓ ĐƠN HOẶC XE CHƯA PHÂN MIỀN */}
          {data.regions.na.totalWeightKg > 0 && (
            <div className='flex items-center justify-between rounded-md border border-amber-300 bg-amber-50/80 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'>
              <div className='flex items-center gap-2'>
                <IconAlertTriangle className='h-4 w-4 shrink-0 text-amber-600' />
                <span>
                  <strong>CẢNH BÁO CHƯA PHÂN MIỀN:</strong>{' '}
                  {data.regions.na.onhandOrderCount > 0 && (
                    <>
                      Có{' '}
                      <strong>
                        {data.regions.na.onhandOrderCount} đơn hàng tồn kho (
                        {data.regions.na.onhandWeightTons} Tấn •{' '}
                        {formatNumber(data.regions.na.onhandPackageCount)} kiện)
                      </strong>{' '}
                    </>
                  )}
                  {data.regions.na.incomingTripCount > 0 && (
                    <>
                      {data.regions.na.onhandOrderCount > 0 ? 'và ' : 'Có '}
                      <strong>
                        {data.regions.na.incomingTripCount} chuyến xe sắp về (
                        {data.regions.na.incomingWeightTons} Tấn)
                      </strong>{' '}
                    </>
                  )}
                  chưa xác định được Miền do thiếu hoặc sai tỉnh thành (Tổng:{' '}
                  {data.regions.na.totalWeightTons} Tấn).
                </span>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setRegionFilter('N/A');
                  setActiveTab(
                    data.regions.na.onhandOrderCount > 0 ? 'ONHAND' : 'INCOMING'
                  );
                }}
                className='h-7 border-amber-400 bg-white text-[10px] text-amber-800 dark:bg-slate-900 dark:text-amber-300'
              >
                Rà soát danh sách
              </Button>
            </div>
          )}

          {/* ── BẢNG KÊ CHI TIẾT (DRILL-DOWN TABS) ───────────────────────── */}
          <div className='rounded-md border bg-card p-1.5 shadow-xs'>
            {/* TAB CONTROLS & FILTER */}
            <div className='flex flex-wrap items-center justify-between gap-1.5 border-b pb-1.5'>
              <div className='flex items-center gap-1'>
                <Button
                  variant={activeTab === 'ONHAND' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setActiveTab('ONHAND')}
                  className='h-7 text-xs'
                >
                  <IconPackage className='mr-1 h-3.5 w-3.5' />
                  Hàng Có Sẵn Tại Kho ({data.onhandOrdersList?.length || 0})
                </Button>
                <Button
                  variant={activeTab === 'INCOMING' ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setActiveTab('INCOMING')}
                  className='h-7 text-xs'
                >
                  <IconTruck className='mr-1 h-3.5 w-3.5' />
                  Xe Đang Về Kho ({data.incomingTripsList?.length || 0})
                </Button>
              </div>

              {/* BỘ LỌC MIỀN & TÌM KIẾM */}
              <div className='flex items-center gap-1.5'>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className='h-7 rounded-md border bg-background px-1.5 text-[10px] font-medium'
                >
                  <option value='ALL'>Tất cả các Miền</option>
                  <option value='MIỀN BẮC'>Miền Bắc</option>
                  <option value='MIỀN TRUNG'>Miền Trung</option>
                  <option value='MIỀN NAM'>Miền Nam (gồm Miền Tây)</option>
                  <option value='N/A'>N/A (Chưa phân miền)</option>
                </select>

                <div className='relative w-44 md:w-56'>
                  <IconSearch className='absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    placeholder='Tìm mã đơn, tỉnh, xe...'
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className='h-7 pl-7 text-[11px]'
                  />
                </div>
              </div>
            </div>

            {/* NỘI DUNG TAB 1: HÀNG TỒN TẠI KHO */}
            {activeTab === 'ONHAND' && (
              <div className='overflow-x-auto pt-1'>
                <table className='w-full text-left text-[10px]'>
                  <thead className='sticky top-0 bg-muted/60 text-muted-foreground'>
                    <tr>
                      <th className='py-1 px-1.5'>STT</th>
                      <th className='py-1 px-1.5'>Mã Đơn Hàng</th>
                      <th className='py-1 px-1.5'>Tỉnh/Thành Đến</th>
                      <th className='py-1 px-1.5'>Miền</th>
                      <th className='py-1 px-1.5 text-right'>Số Kiện Tồn</th>
                      <th className='py-1 px-1.5 text-right'>Khối Lượng (Kg)</th>
                      <th className='py-1 px-1.5 text-right'>Tấn</th>
                      <th className='py-1 px-1.5 text-right'>Thể Tích (m³)</th>
                      <th className='py-1 px-1.5'>Diễn Giải Hàng</th>
                      <th className='py-1 px-1.5'>Kho Hiện Tại</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {filteredOnhandOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className='py-4 text-center text-xs text-muted-foreground'>
                          Không có đơn hàng nào khớp với điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredOnhandOrders.map((ord, idx) => (
                        <tr key={ord.id} className='hover:bg-muted/30'>
                          <td className='py-1 px-1.5 text-muted-foreground'>{idx + 1}</td>
                          <td className='py-1 px-1.5 font-mono font-bold text-foreground'>
                            {ord.orderCode}
                          </td>
                          <td className='py-1 px-1.5 font-medium'>{ord.province}</td>
                          <td className='py-1 px-1.5'>
                            <span
                              className={`inline-block rounded px-1 py-0.5 text-[9px] font-semibold ${
                                ord.region === 'MIỀN BẮC'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : ord.region === 'MIỀN TRUNG'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : ord.region === 'MIỀN NAM'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {ord.region}
                            </span>
                          </td>
                          <td className='py-1 px-1.5 text-right font-medium'>{formatNumber(ord.remainingQuantity)}</td>
                          <td className='py-1 px-1.5 text-right'>{formatNumber(ord.weightKg)}</td>
                          <td className='py-1 px-1.5 text-right font-semibold'>{ord.weightTons}</td>
                          <td className='py-1 px-1.5 text-right'>{ord.volumeCbm}</td>
                          <td className='py-1 px-1.5 max-w-[200px] truncate text-muted-foreground'>
                            {ord.goodsDescription || '—'}
                          </td>
                          <td className='py-1 px-1.5 text-muted-foreground'>{ord.currentHubName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* NỘI DUNG TAB 2: XE ĐANG VỀ KHO */}
            {activeTab === 'INCOMING' && (
              <div className='overflow-x-auto pt-1'>
                <table className='w-full text-left text-[10px]'>
                  <thead className='sticky top-0 bg-muted/60 text-muted-foreground'>
                    <tr>
                      <th className='py-1 px-1.5'>STT</th>
                      <th className='py-1 px-1.5'>Mã Chuyến (TRIP)</th>
                      <th className='py-1 px-1.5'>Biển Số Xe</th>
                      <th className='py-1 px-1.5'>Tài Xế</th>
                      <th className='py-1 px-1.5'>Kho Gửi</th>
                      <th className='py-1 px-1.5'>Kho Đích (Nhận)</th>
                      <th className='py-1 px-1.5'>Mã Đơn Đi Kèm</th>
                      <th className='py-1 px-1.5'>Tỉnh Trả</th>
                      <th className='py-1 px-1.5'>Miền</th>
                      <th className='py-1 px-1.5 text-right'>Tải Trọng (Tấn)</th>
                      <th className='py-1 px-1.5 text-right'>Số Khối (m³)</th>
                      <th className='py-1 px-1.5 text-right'>Kiện</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {filteredIncomingTrips.length === 0 ? (
                      <tr>
                        <td colSpan={12} className='py-4 text-center text-xs text-muted-foreground'>
                          Hiện không có chuyến xe nào đang trên đường về kho.
                        </td>
                      </tr>
                    ) : (
                      filteredIncomingTrips.map((trip, idx) => (
                        <tr key={trip.id} className='hover:bg-muted/30'>
                          <td className='py-1 px-1.5 text-muted-foreground'>{idx + 1}</td>
                          <td className='py-1 px-1.5 font-mono font-bold text-foreground'>
                            {trip.tripCode}
                          </td>
                          <td className='py-1 px-1.5 font-semibold text-primary'>{trip.licensePlate}</td>
                          <td className='py-1 px-1.5'>{trip.driverName}</td>
                          <td className='py-1 px-1.5 text-muted-foreground'>{trip.originHubName}</td>
                          <td className='py-1 px-1.5 font-medium'>{trip.destinationHubName}</td>
                          <td className='py-1 px-1.5 font-mono'>{trip.orderCode || '—'}</td>
                          <td className='py-1 px-1.5'>{trip.province || '—'}</td>
                          <td className='py-1 px-1.5'>
                            <span
                              className={`inline-block rounded px-1 py-0.5 text-[9px] font-semibold ${
                                trip.region === 'MIỀN BẮC'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : trip.region === 'MIỀN TRUNG'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : trip.region === 'MIỀN NAM'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {trip.region}
                            </span>
                          </td>
                          <td className='py-1 px-1.5 text-right font-bold text-foreground'>
                            {trip.weightTons}
                          </td>
                          <td className='py-1 px-1.5 text-right'>{trip.volumeCbm}</td>
                          <td className='py-1 px-1.5 text-right font-medium'>{trip.packageCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
