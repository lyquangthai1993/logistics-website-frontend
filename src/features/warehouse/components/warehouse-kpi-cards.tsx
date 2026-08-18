'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { Trip } from '@/features/trips/api/types';

interface WarehouseKpiCardsProps {
  trips?: Trip[];
  loading?: boolean;
}

export function WarehouseKpiCards({ trips = [], loading = false }: WarehouseKpiCardsProps) {
  const metrics = useMemo(() => {
    const totalTrips = trips.length;
    const externalTrips = trips.filter((t) => t.vehicle?.isExternal).length;
    const totalWeight = trips.reduce((acc, t) => acc + (t.weightAllocated || 0), 0);
    const totalVolume = Number(
      trips.reduce((acc, t) => acc + (t.volumeAllocated || 0), 0).toFixed(1)
    );
    return { totalTrips, externalTrips, totalWeight, totalVolume };
  }, [trips]);

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      {/* 1. Tổng chuyến sắp đến */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-slate-600 dark:text-slate-400'>
            Tổng chuyến sắp đến
          </CardTitle>
          <Icons.truck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-slate-900 dark:text-slate-100'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-blue-100 dark:bg-blue-950/50 rounded animate-pulse' />
            ) : (
              metrics.totalTrips
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Chuyến xe đã xác nhận / đang chạy</p>
        </CardContent>
      </Card>

      {/* 2. Xe thuê ngoài (Đối tác) */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-amber-600 dark:text-amber-400'>
            Xe thuê ngoài (Đối tác)
          </CardTitle>
          <Icons.alertCircle className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-amber-100 dark:bg-amber-950/50 rounded animate-pulse' />
            ) : (
              metrics.externalTrips
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Cần kiểm tra giấy tờ đối tác</p>
        </CardContent>
      </Card>

      {/* 3. Tổng tải trọng dự kiến */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
            Tổng tải trọng dự kiến
          </CardTitle>
          <Icons.box className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
            {loading ? (
              <span className='inline-block h-8 w-24 bg-emerald-100 dark:bg-emerald-950/50 rounded animate-pulse' />
            ) : (
              `${metrics.totalWeight.toLocaleString()} kg`
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Khối lượng hàng tiếp nhận</p>
        </CardContent>
      </Card>

      {/* 4. Tổng thể tích hàng */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-purple-600 dark:text-purple-400'>
            Tổng thể tích hàng
          </CardTitle>
          <Icons.box className='h-4 w-4 text-purple-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono'>
            {loading ? (
              <span className='inline-block h-8 w-20 bg-purple-100 dark:bg-purple-950/50 rounded animate-pulse' />
            ) : (
              `${metrics.totalVolume} m³`
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Thể tích kho cần chuẩn bị</p>
        </CardContent>
      </Card>
    </div>
  );
}
