import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardFooter } from '@/components/ui/card';
import { AreaGraphSkeleton } from '@/features/overview/components/area-graph-skeleton';
import { BarGraphSkeleton } from '@/features/overview/components/bar-graph-skeleton';
import { PieGraphSkeleton } from '@/features/overview/components/pie-graph-skeleton';
import { RecentSalesSkeleton } from '@/features/overview/components/recent-sales-skeleton';

function StatCardSkeleton() {
  return (
    <Card className='@container/card'>
      <CardHeader>
        <Skeleton className='h-4 w-[120px]' />
        <Skeleton className='h-8 w-[100px]' />
        <Skeleton className='ml-auto h-6 w-[70px] rounded-full' />
      </CardHeader>
      <CardFooter className='flex-col items-start gap-1.5'>
        <Skeleton className='h-4 w-[160px]' />
        <Skeleton className='h-4 w-[130px]' />
      </CardFooter>
    </Card>
  );
}

export default function OverviewLoading() {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <Skeleton className='h-8 w-[220px]' />
        </div>

        {/* Stat Cards — 4 columns */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Charts grid — mirrors overview.tsx */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>
            <BarGraphSkeleton />
          </div>
          <div className='col-span-4 md:col-span-3'>
            <RecentSalesSkeleton />
          </div>
          <div className='col-span-4'>
            <AreaGraphSkeleton />
          </div>
          <div className='col-span-4 min-h-0 md:col-span-3'>
            <PieGraphSkeleton />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
