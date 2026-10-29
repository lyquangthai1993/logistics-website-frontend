import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function PieGraphSkeleton() {
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-6 w-25' />
          <Skeleton className='h-5 w-15 rounded-full' />
        </div>
        <Skeleton className='h-4 w-37.5' />
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <Skeleton className='h-62.5 w-62.5 rounded-full' />
      </CardContent>
    </Card>
  );
}
