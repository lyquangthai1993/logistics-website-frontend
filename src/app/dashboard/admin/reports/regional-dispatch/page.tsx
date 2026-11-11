import React, { Suspense } from 'react';
import { SuperAdminRegionalDispatch } from '@/features/admin-reports/components/super-admin-regional-dispatch';

export const metadata = {
  title: 'Cân Đối Tải Trọng Đội Xe Theo Miền (Bắc - Trung - Nam) | Logistics TMS',
  description: 'Báo cáo tổng hợp Tồn kho và Hàng sắp về theo 3 Miền phục vụ điều vận đội xe'
};

export default function RegionalDispatchPage() {
  return (
    <Suspense
      fallback={
        <div className='p-2 text-xs text-muted-foreground'>
          Đang tải dữ liệu cân đối tải trọng đội xe theo miền...
        </div>
      }
    >
      <SuperAdminRegionalDispatch />
    </Suspense>
  );
}
