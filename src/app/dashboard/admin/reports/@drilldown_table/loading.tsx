import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DrilldownTableParallelSlotLoading() {
  return (
    <Card className='p-2 border-slate-200 dark:border-slate-800 shadow-2xs'>
      <CardContent className='p-0 space-y-1.5'>
        <div className='flex items-center justify-between border-b pb-1.5'>
          <div className='flex items-center gap-1'>
            <Skeleton className='h-7 w-40' />
            <Skeleton className='h-7 w-44' />
            <Skeleton className='h-7 w-36' />
          </div>
          <Skeleton className='h-7 w-56' />
        </div>
        <Skeleton className='h-64 w-full rounded' />
      </CardContent>
    </Card>
  );
}
