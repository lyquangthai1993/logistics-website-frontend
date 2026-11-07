'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

export default function DrilldownTableParallelSlotError({
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Card className='p-2.5 border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'>
      <CardContent className='p-0 flex items-center justify-between gap-2 text-xs'>
        <div className='flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold'>
          <IconAlertTriangle className='h-4 w-4 shrink-0' />
          <span>Không thể tải bảng đối soát chuyến xe xác nhận.</span>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => reset()}
          className='h-7 px-2 text-[10px]'
        >
          <IconRefresh className='h-3 w-3 mr-1' />
          Thử lại
        </Button>
      </CardContent>
    </Card>
  );
}
