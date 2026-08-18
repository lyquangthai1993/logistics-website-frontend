'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconClock,
  IconCircleCheck,
  IconTruck,
  IconAlertTriangle
} from '@tabler/icons-react';
import type { TripStats } from '../api/types';

interface TripsKpiCardsProps {
  stats?: TripStats | null;
  externalVehiclesCount?: number;
  loading?: boolean;
}

export function TripsKpiCards({
  stats,
  externalVehiclesCount = 0,
  loading = false
}: TripsKpiCardsProps) {
  const confirmedTripsCount = stats
    ? (stats.tripsConfirmed ?? 0) + (stats.tripsInTransit ?? 0)
    : null;

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      {/* 1. Đơn hàng cần phân xe */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-blue-600 dark:text-blue-400'>
            Đơn hàng cần phân xe
          </CardTitle>
          <IconClock className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-blue-100 dark:bg-blue-950/50 rounded animate-pulse' />
            ) : (
              stats?.ordersAwaitingFleet ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Đang chờ Fleet xử lý</p>
        </CardContent>
      </Card>

      {/* 2. Chuyến xe đã xác nhận */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
            Chuyến xe đã xác nhận
          </CardTitle>
          <IconCircleCheck className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-emerald-100 dark:bg-emerald-950/50 rounded animate-pulse' />
            ) : (
              confirmedTripsCount ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Trong kỳ thống kê</p>
        </CardContent>
      </Card>

      {/* 3. Xe thuê ngoài (External) */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-amber-600 dark:text-amber-400'>
            Xe thuê ngoài (External)
          </CardTitle>
          <IconTruck className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-amber-100 dark:bg-amber-950/50 rounded animate-pulse' />
            ) : (
              externalVehiclesCount
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Xe đối tác khả dụng</p>
        </CardContent>
      </Card>

      {/* 4. Đơn báo không có xe */}
      <Card className='shadow-xs border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium text-rose-600 dark:text-rose-400'>
            Đơn báo không có xe
          </CardTitle>
          <IconAlertTriangle className='h-4 w-4 text-rose-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-rose-100 dark:bg-rose-950/50 rounded animate-pulse' />
            ) : (
              stats?.ordersNoVehicle ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Cần Dispatcher thuê xe ngoài</p>
        </CardContent>
      </Card>
    </div>
  );
}
