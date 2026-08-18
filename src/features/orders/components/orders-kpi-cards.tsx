'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconFileText,
  IconClock,
  IconCircleCheck,
  IconAlertTriangle
} from '@tabler/icons-react';
import type { OrderStats } from '../api/types';

interface OrdersKpiCardsProps {
  stats?: OrderStats | null;
  loading?: boolean;
}

export function OrdersKpiCards({ stats, loading = false }: OrdersKpiCardsProps) {
  const assignedAndTransit = stats ? stats.assigned + stats.inTransit : null;

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {/* 1. Tổng số đơn hàng */}
      <Card className='border-slate-200/80 shadow-sm dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-slate-600 dark:text-slate-400'>
            Tổng số đơn hàng
          </CardTitle>
          <IconFileText className='h-4 w-4 text-slate-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-slate-900 dark:text-slate-50'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse' />
            ) : (
              stats?.total ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Tổng trong kỳ đã chọn</p>
        </CardContent>
      </Card>

      {/* 2. Chờ điều phối xe */}
      <Card className='border-slate-200/80 shadow-sm dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-blue-600 dark:text-blue-400'>
            Chờ điều phối xe
          </CardTitle>
          <IconClock className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-blue-100 dark:bg-blue-950/50 rounded animate-pulse' />
            ) : (
              stats?.pending ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Đã gửi yêu cầu lên Fleet</p>
        </CardContent>
      </Card>

      {/* 3. Đã phân công xe */}
      <Card className='border-slate-200/80 shadow-sm dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
            Đã phân công xe
          </CardTitle>
          <IconCircleCheck className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-emerald-100 dark:bg-emerald-950/50 rounded animate-pulse' />
            ) : (
              assignedAndTransit ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Đã xác nhận + Đang vận chuyển</p>
        </CardContent>
      </Card>

      {/* 4. Hết / Chưa có xe */}
      <Card className='border-slate-200/80 shadow-sm dark:border-slate-800'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-rose-600 dark:text-rose-400'>
            Hết / Chưa có xe
          </CardTitle>
          <IconAlertTriangle className='h-4 w-4 text-rose-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
            {loading ? (
              <span className='inline-block h-8 w-12 bg-rose-100 dark:bg-rose-950/50 rounded animate-pulse' />
            ) : (
              stats?.noVehicle ?? '—'
            )}
          </div>
          <p className='text-xs text-slate-500 mt-1'>Cần tìm xe thuê ngoài</p>
        </CardContent>
      </Card>
    </div>
  );
}
