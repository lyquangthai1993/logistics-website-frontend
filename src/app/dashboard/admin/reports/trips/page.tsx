import React, { Suspense } from 'react';
import { SuperAdminDailyTripsTracker } from '@/features/admin-reports/components/super-admin-daily-trips-tracker';

export const metadata = {
  title: 'Theo Dõi Chi Tiết Mã TRIP Nhập/Xuất Theo Ngày | Logistics TMS'
};

export default function SuperAdminDailyTripsPage() {
  return (
    <Suspense
      fallback={
        <div className='p-2 text-xs text-muted-foreground'>
          Đang tải trang theo dõi chi tiết mã TRIP theo ngày...
        </div>
      }
    >
      <SuperAdminDailyTripsTracker />
    </Suspense>
  );
}
