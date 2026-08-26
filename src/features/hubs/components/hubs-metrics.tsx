'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { hubsQueryOptions } from '../api/queries';
import type { Hub } from '../api/types';

export function HubsMetrics() {
  // Query all hubs with limit 100 to calculate global summary metrics
  const { data } = useQuery(hubsQueryOptions({ limit: 100 }));
  const hubs: Hub[] = data?.data || [];
  const total = data?.meta?.total ?? hubs.length;
  const activeCount = hubs.filter((h) => h.isActive).length;
  const inactiveCount = Math.max(0, total - activeCount);
  const totalVehicles = hubs.reduce((sum, h) => sum + (h.vehicles?.length || 0), 0);

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      <Card className='border-border/60 shadow-xs transition-all duration-200 hover:border-primary/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-muted-foreground text-sm font-medium'>
            Tổng Số Chi Nhánh
          </CardTitle>
          <Icons.warehouse className='text-primary h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{total}</div>
          <p className='text-muted-foreground mt-1 text-xs'>Điểm trung chuyển hàng hóa</p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs transition-all duration-200 hover:border-emerald-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-muted-foreground text-sm font-medium'>
            Đang Hoạt Động
          </CardTitle>
          <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-emerald-600'>{activeCount}</div>
          <p className='text-muted-foreground mt-1 text-xs'>Sẵn sàng tiếp nhận đơn & xe</p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs transition-all duration-200 hover:border-amber-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-muted-foreground text-sm font-medium'>Tạm Ngưng</CardTitle>
          <Icons.circleX className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-amber-600'>{inactiveCount}</div>
          <p className='text-muted-foreground mt-1 text-xs'>Tạm ngừng hoặc bảo trì</p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs transition-all duration-200 hover:border-blue-500/40'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-muted-foreground text-sm font-medium'>
            Tổng Xe Trực Thuộc
          </CardTitle>
          <Icons.truck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600'>{totalVehicles}</div>
          <p className='text-muted-foreground mt-1 text-xs'>Phương tiện phân bổ tại các kho</p>
        </CardContent>
      </Card>
    </div>
  );
}
