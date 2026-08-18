import PageContainer from '@/components/layout/page-container';
import HubsListing from '@/features/hubs/components/hubs-listing';
import { HubFormDialogTrigger } from '@/features/hubs/components/hub-form-dialog';
import { hubsInfoContent } from '@/features/hubs/info-content';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Quản Lý Chi Nhánh Kho (Hubs) | Logistics TMS'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AdminHubsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Quản Lý Chi Nhánh Kho'
      pageDescription='Quản lý mạng lưới kho bãi, chi nhánh tiếp nhận & phân phối hàng hóa trên toàn hệ thống Spider Express'
      infoContent={hubsInfoContent}
      pageHeaderAction={<HubFormDialogTrigger />}
    >
      <HubsListing />
    </PageContainer>
  );
}
