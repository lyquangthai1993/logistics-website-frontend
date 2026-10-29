import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function WarehouseOrdersLoading() {
  return (
    <PageContainer
      pageTitle='Đơn hàng tại kho'
      pageDescription='Quản lý danh sách đơn hàng thực tế lưu kho, đơn nháp và lịch sử xuất hàng.'
    >
      <div className='space-y-2'>
        {/* KPI Cards Skeleton */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='border rounded-lg p-2 bg-card space-y-1.5'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='h-6 w-16' />
            </div>
          ))}
        </div>

        {/* Filter bar Skeleton */}
        <div className='flex items-center justify-between gap-2 py-1'>
          <div className='flex items-center gap-1.5 flex-1 max-w-sm'>
            <Skeleton className='h-8 w-full' />
          </div>
          <div className='flex items-center gap-1.5'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-24' />
          </div>
        </div>

        {/* Table Rows Skeleton matching ~26px compact density */}
        <div className='border rounded-lg overflow-hidden'>
          <div className='h-8 bg-slate-50 dark:bg-slate-800 border-b flex items-center px-2 gap-2'>
            <Skeleton className='h-3 w-8' />
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-3 w-40' />
            <Skeleton className='h-3 w-16 ml-auto' />
          </div>
          <div className='divide-y divide-gray-100 dark:divide-gray-800'>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className='h-6.5 flex items-center px-2 gap-2'>
                <Skeleton className='h-2.5 w-6' />
                <Skeleton className='h-2.5 w-16' />
                <Skeleton className='h-2.5 w-20' />
                <Skeleton className='h-2.5 w-48' />
                <Skeleton className='h-2.5 w-12 ml-auto' />
                <Skeleton className='h-2.5 w-16' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
