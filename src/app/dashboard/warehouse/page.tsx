import PageContainer from '@/components/layout/page-container';
import WarehouseListing from '@/features/warehouse/components/warehouse-listing';
import { warehouseInfoContent } from '@/features/warehouse/info-content';
import { warehouseSearchParamsCache } from '@/features/warehouse/params';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Inbound Hub & Kho Tiếp Nhận | Logistics TMS'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function WarehouseInboundPage(props: PageProps) {
  const searchParams = await props.searchParams;
  warehouseSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Inbound Hub & Kho Tiếp Nhận'
      pageDescription='Bảng theo dõi các chuyến xe vận chuyển hàng hóa sắp cập bến Hub và kho lưu trữ (Inbound Board)'
      infoContent={warehouseInfoContent}
    >
      <WarehouseListing />
    </PageContainer>
  );
}
