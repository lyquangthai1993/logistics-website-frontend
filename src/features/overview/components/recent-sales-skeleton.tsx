import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RecentSalesSkeleton() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <Skeleton className='h-6 w-35' /> {/* CardTitle */}
        <Skeleton className='h-4 w-45' /> {/* CardDescription */}
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center'>
              <Skeleton className='h-9 w-9 rounded-full' /> {/* Avatar */}
              <div className='ml-4 space-y-1'>
                <Skeleton className='h-4 w-30' /> {/* Name */}
                <Skeleton className='h-4 w-40' /> {/* Email */}
              </div>
              <Skeleton className='ml-auto h-4 w-20' /> {/* Amount */}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
