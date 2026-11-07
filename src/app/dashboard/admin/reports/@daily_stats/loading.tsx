import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DailyStatsParallelSlotLoading() {
  return (
    <Card className='p-2.5 border-slate-200 dark:border-slate-800 shadow-xs'>
      <CardContent className='p-0 space-y-2'>
        <div className='flex items-center justify-between border-b pb-1.5'>
          <div className='space-y-1'>
            <Skeleton className='h-3.5 w-64' />
            <Skeleton className='h-3 w-48' />
          </div>
          <Skeleton className='h-7 w-36' />
        </div>
        <Skeleton className='h-72 w-full rounded' />
        <div className='flex flex-col items-center space-y-1 pt-1 border-t'>
          <Skeleton className='h-4 w-52' />
          <Skeleton className='h-3.5 w-64' />
        </div>
      </CardContent>
    </Card>
  );
}
