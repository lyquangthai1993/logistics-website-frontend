import { Suspense } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import TripsListing from '@/features/trips/components/trips-listing';
import { tripsInfoContent } from '@/features/trips/info-content';
import { tripsSearchParamsCache } from '@/features/trips/params';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { IconTruck } from '@tabler/icons-react';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Phân Công Xe & Quản Lý Chuyến | Logistics TMS'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function TripsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  tripsSearchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Phân Công Xe & Quản Lý Chuyến'
      pageDescription='Tiếp nhận yêu cầu điều vận từ Dispatcher, phân bổ xe nội bộ/thuê ngoài và chia chuyến vận tải.'
      infoContent={tripsInfoContent}
      pageHeaderAction={
        <Link href='/dashboard/fleet'>
          <Button variant='outline' className='cursor-pointer'>
            <IconTruck className='mr-2 h-4 w-4' /> Quản lý đội xe
          </Button>
        </Link>
      }
    >
      <Suspense
        fallback={
          <DataTableSkeleton
            columnCount={7}
            rowCount={10}
            filterCount={2}
          />
        }
      >
        <TripsListing />
      </Suspense>
    </PageContainer>
  );
}
