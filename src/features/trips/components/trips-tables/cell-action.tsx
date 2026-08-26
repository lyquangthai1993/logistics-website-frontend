'use client';

import { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  IconDotsVertical,
  IconCheck,
  IconEye,
  IconCircleCheck,
  IconTrash
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  useConfirmTripMutation,
  useUpdateTripMutation,
  useDeleteTripMutation
} from '../../api/mutations';
import type { Trip } from '../../api/types';

interface CellActionProps {
  data: Trip;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const confirmTripMutation = useConfirmTripMutation();
  const updateTripMutation = useUpdateTripMutation();
  const deleteTripMutation = useDeleteTripMutation();

  const isPending =
    confirmTripMutation.isPending || updateTripMutation.isPending || deleteTripMutation.isPending;

  const handleConfirmTrip = async (tripId: number) => {
    try {
      await confirmTripMutation.mutateAsync(tripId);
      toast.success('Xác nhận chuyến xe thành công!', {
        description: 'Đã cập nhật trạng thái và tự động gửi thông báo đến Inbound Kho.'
      });
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Không thể xác nhận chuyến xe. Vui lòng thử lại.');
    }
  };

  const handleCompleteTrip = async () => {
    try {
      await updateTripMutation.mutateAsync({
        id: data.id,
        payload: { status: 'COMPLETED' }
      });
      toast.success('Đã hoàn thành chuyến xe!');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Không thể hoàn thành chuyến xe. Vui lòng thử lại.');
    }
  };

  const handleDeleteTrip = async () => {
    try {
      await deleteTripMutation.mutateAsync(data.id);
      toast.success('Đã hủy chuyến xe!');
      setDeleteOpen(false);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Không thể hủy chuyến xe. Vui lòng thử lại.');
    }
  };

  return (
    <>
      <div className='flex items-center justify-end gap-2'>
        {data.status === 'PENDING' && (
          <Button
            size='sm'
            onClick={() => handleConfirmTrip(data.id)}
            disabled={isPending}
            className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 cursor-pointer shadow-2xs'
          >
            <IconCheck className='h-3.5 w-3.5 mr-1' />
            Xác nhận Trip
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
            <IconDotsVertical className='h-4 w-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {data.orderId ? (
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/orders/${data.orderId}`)}
                  className='cursor-pointer'
                >
                  <IconEye className='mr-2 h-4 w-4 text-blue-500' />
                  Xem chi tiết đơn
                </DropdownMenuItem>
              ) : null}

              {data.status === 'IN_TRANSIT' && (
                <DropdownMenuItem onClick={handleCompleteTrip} className='cursor-pointer'>
                  <IconCircleCheck className='mr-2 h-4 w-4 text-emerald-600' />
                  Đánh dấu hoàn thành
                </DropdownMenuItem>
              )}

              {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className='cursor-pointer text-rose-600 focus:text-rose-600'
                >
                  <IconTrash className='mr-2 h-4 w-4 text-rose-600' />
                  Hủy chuyến xe
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy chuyến xe</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy Chuyến #{data.sequenceNumber || data.id} của đơn{' '}
              <strong className='font-mono text-slate-900 dark:text-slate-100'>
                {data.order?.orderCode || `#${data.orderId}`}
              </strong>
              ? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTripMutation.isPending} className='cursor-pointer'>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTrip();
              }}
              disabled={deleteTripMutation.isPending}
              className='bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
            >
              {deleteTripMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
