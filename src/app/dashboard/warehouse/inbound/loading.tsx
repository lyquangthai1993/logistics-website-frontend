import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';

export default function WarehouseInboundLoading() {
  return (
    <PageContainer
      pageTitle='Vận hành Nhập kho'
      pageDescription='Quản lý xe đến, tiếp nhận và kiểm đếm dỡ hàng thực tế vào kho bãi.'
    >
      <div className='space-y-2'>
        {/* KPI Cards / Tabs Skeleton */}
        <div className='flex items-center justify-between gap-2 border-b pb-1.5'>
          <div className='flex items-center gap-1.5'>
            <Skeleton className='h-8 w-28' />
            <Skeleton className='h-8 w-28' />
          </div>
          <div className='flex items-center gap-1.5'>
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-32' />
          </div>
        </div>

        {/* Inbound Board Skeleton */}
        <div className='border rounded-lg overflow-hidden'>
          <div className='h-8 bg-slate-50 dark:bg-slate-800 border-b flex items-center px-2 gap-2'>
            <Skeleton className='h-3 w-8' />
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-3 w-32' />
            <Skeleton className='h-3 w-20 ml-auto' />
          </div>
          <div className='divide-y divide-gray-100 dark:divide-gray-800'>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className='h-8 flex items-center px-2 gap-2'>
                <Skeleton className='h-2.5 w-6' />
                <Skeleton className='h-2.5 w-20' />
                <Skeleton className='h-2.5 w-24' />
                <Skeleton className='h-2.5 w-40' />
                <Skeleton className='h-2.5 w-16 ml-auto' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
