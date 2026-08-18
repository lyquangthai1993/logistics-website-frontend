'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconTruck, IconUserCheck, IconTools } from '@tabler/icons-react';
import type { Vehicle, Driver } from '../api/types';

interface FleetKpiCardsProps {
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function FleetKpiCards({ vehicles, drivers }: FleetKpiCardsProps) {
  const inUseCount = vehicles.filter((v) => v.status === 'IN_USE').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  return (
    <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
      <Card className='shadow-xs border-border/60 hover:border-primary/40 transition-all duration-200'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>Tổng Số Xe</CardTitle>
          <IconTruck className='h-4 w-4 text-primary' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{vehicles.length}</div>
          <p className='text-xs text-muted-foreground mt-1'>Phương tiện vận chuyển</p>
        </CardContent>
      </Card>

      <Card className='shadow-xs border-border/60 hover:border-blue-500/40 transition-all duration-200'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            Xe Đang Chạy Chuyến
          </CardTitle>
          <IconTruck className='h-4 w-4 text-blue-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-blue-600'>{inUseCount}</div>
          <p className='text-xs text-muted-foreground mt-1'>Trên hành trình vận tải</p>
        </CardContent>
      </Card>

      <Card className='shadow-xs border-border/60 hover:border-emerald-500/40 transition-all duration-200'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            Tổng Số Tài Xế
          </CardTitle>
          <IconUserCheck className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-emerald-600'>{drivers.length}</div>
          <p className='text-xs text-muted-foreground mt-1'>Đã đăng ký bằng lái</p>
        </CardContent>
      </Card>

      <Card className='shadow-xs border-border/60 hover:border-amber-500/40 transition-all duration-200'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>Xe Bảo Trì</CardTitle>
          <IconTools className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold text-amber-600'>{maintenanceCount}</div>
          <p className='text-xs text-muted-foreground mt-1'>Đang kiểm tra bảo dưỡng</p>
        </CardContent>
      </Card>
    </div>
  );
}
