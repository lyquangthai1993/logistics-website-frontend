import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import OrdersListing from '@/features/orders/components/orders-listing';
import { OrderCreateDialogTrigger } from '@/features/orders/components/order-create-dialog';
import { ordersInfoContent } from '@/features/orders/info-content';
import { ordersSearchParamsCache } from '@/features/orders/params';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Lập Lệnh Điều Vận | Logistics TMS'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function OrdersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  ordersSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Lập Lệnh Điều Vận'
      pageDescription='Quản lý kế hoạch vận chuyển hàng hóa, tạo đơn hàng và gửi yêu cầu phân bổ phương tiện.'
      infoContent={ordersInfoContent}
      pageHeaderAction={<OrderCreateDialogTrigger />}
    >
      <Suspense fallback={<DataTableSkeleton columnCount={7} rowCount={10} filterCount={2} />}>
        <OrdersListing />
      </Suspense>
    </PageContainer>
  );
}
