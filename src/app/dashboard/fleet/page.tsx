import PageContainer from '@/components/layout/page-container';
import FleetListingPage from '@/features/fleet/components/fleet-listing';
import { fleetInfoContent } from '@/features/fleet/info-content';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Quản Lý Đội Xe'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function FleetPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Quản Lý Đội Xe'
      pageDescription='Theo dõi danh sách phương tiện, sức chứa tải trọng, bằng lái & tình trạng tài xế Spider Express'
      infoContent={fleetInfoContent}
    >
      <FleetListingPage />
    </PageContainer>
  );
}
