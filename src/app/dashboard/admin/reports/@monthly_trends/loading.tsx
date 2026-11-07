import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonthlyTrendsParallelSlotLoading() {
  return (
    <Card className='p-2.5 border-slate-200 dark:border-slate-800 shadow-xs'>
      <CardContent className='p-0 space-y-2'>
        <div className='flex items-center justify-between border-b pb-1.5'>
          <div className='space-y-1'>
            <Skeleton className='h-3.5 w-72' />
            <Skeleton className='h-3 w-56' />
          </div>
          <Skeleton className='h-5 w-44' />
        </div>
        <Skeleton className='h-56 w-full rounded' />
        <Skeleton className='h-56 w-full rounded' />
      </CardContent>
    </Card>
  );
}
