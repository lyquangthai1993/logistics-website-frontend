'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { useUpdateTripMutation } from '@/features/trips/api/mutations';
import type { Trip } from '@/features/trips/api/types';

interface CellActionProps {
  data: Trip;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const updateTripMutation = useUpdateTripMutation();

  const handleCompleteTrip = async () => {
    try {
      await updateTripMutation.mutateAsync({
        id: data.id,
        payload: { status: 'COMPLETED' }
      });
      toast.success('Đã xác nhận tiếp nhận hàng và hoàn thành chuyến xe!');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Không thể cập nhật trạng thái chuyến xe. Vui lòng thử lại.');
    }
  };

  const handleCopyOrderCode = () => {
    const code = data.order?.orderCode || `Đơn #${data.orderId}`;
    navigator.clipboard.writeText(code);
    toast.success(`Đã sao chép mã đơn: ${code}`);
  };

  return (
    <div className='flex items-center justify-end gap-2'>
      {data.status === 'IN_TRANSIT' && (
        <Button
          size='sm'
          onClick={handleCompleteTrip}
          disabled={updateTripMutation.isPending}
          className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 cursor-pointer shadow-2xs'
        >
          <Icons.check className='h-3.5 w-3.5 mr-1' />
          Nhận Hàng
        </Button>
      )}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              className='h-8 w-8 p-0 cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            />
          }
        >
          <span className='sr-only'>Mở menu</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-52'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Thao tác Inbound</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {data.orderId ? (
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/orders/${data.orderId}`)}
                className='cursor-pointer'
              >
                <Icons.eye className='mr-2 h-4 w-4 text-blue-500' />
                Xem chi tiết đơn hàng
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuItem onClick={handleCopyOrderCode} className='cursor-pointer'>
              <Icons.copy className='mr-2 h-4 w-4 text-slate-500' />
              Sao chép mã đơn
            </DropdownMenuItem>

            {data.status !== 'COMPLETED' && (
              <DropdownMenuItem
                onClick={handleCompleteTrip}
                disabled={updateTripMutation.isPending}
                className='cursor-pointer text-emerald-600 focus:text-emerald-600'
              >
                <Icons.circleCheck className='mr-2 h-4 w-4 text-emerald-600' />
                Đánh dấu đã nhận hàng
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
