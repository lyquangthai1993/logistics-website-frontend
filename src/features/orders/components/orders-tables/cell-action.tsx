'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  IconEye,
  IconTruck,
  IconSend,
  IconLoader2,
  IconEdit,
  IconTrash
} from '@tabler/icons-react';
import { useSubmitOrderToFleetMutation } from '../../api/mutations';
import { OrderDeleteDialog } from '../order-delete-dialog';
import { OrderEditDialog } from '../order-edit-dialog';
import { OrderExternalDialog } from '../order-external-dialog';
import type { Order } from '../../api/types';

interface CellActionProps {
  order: Order;
}

export function CellAction({ order }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);

  const submitMutation = useSubmitOrderToFleetMutation();

  const handleSubmitToFleet = async () => {
    try {
      await submitMutation.mutateAsync(order.id);
      toast.success('Đã gửi lệnh điều vận lên Đội xe (Fleet)!');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể gửi lệnh điều vận. Vui lòng thử lại.');
    }
  };

  const isDraftOrNoVehicle = order.status === 'DRAFT' || order.status === 'NO_VEHICLE';

  return (
    <>
      <OrderDeleteDialog
        order={order}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <OrderEditDialog
        order={order}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <OrderExternalDialog
        order={order}
        open={externalOpen}
        onOpenChange={setExternalOpen}
      />

      <div className='flex items-center justify-end gap-1.5'>
        {/* Xem chi tiết */}
        <Link href={`/dashboard/orders/${order.id}`}>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 cursor-pointer'
            title='Xem chi tiết đơn hàng'
            aria-label='Xem chi tiết đơn hàng'
          >
            <IconEye className='h-4 w-4' />
          </Button>
        </Link>

        {/* Xử lý thuê xe ngoài khi NO_VEHICLE */}
        {order.status === 'NO_VEHICLE' && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setExternalOpen(true)}
            className='h-8 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 cursor-pointer'
            title='Xử lý thuê xe ngoài'
          >
            <IconTruck className='h-3.5 w-3.5 mr-1 text-amber-600' />
            Xe ngoài
          </Button>
        )}

        {/* Gửi Fleet */}
        {isDraftOrNoVehicle && (
          <Button
            type='button'
            onClick={handleSubmitToFleet}
            variant='outline'
            size='sm'
            disabled={submitMutation.isPending}
            className='h-8 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
            title='Gửi lệnh điều vận lên Đội xe'
          >
            {submitMutation.isPending ? (
              <>
                <IconLoader2 className='h-3.5 w-3.5 mr-1 animate-spin' />
                Đang gửi...
              </>
            ) : (
              <>
                <IconSend className='h-3.5 w-3.5 mr-1' />
                Gửi Fleet
              </>
            )}
          </Button>
        )}

        {/* Chỉnh sửa đơn nháp */}
        {order.status === 'DRAFT' && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setEditOpen(true)}
            className='h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 cursor-pointer'
            title='Chỉnh sửa đơn hàng'
            aria-label='Chỉnh sửa đơn hàng'
          >
            <IconEdit className='h-4 w-4' />
          </Button>
        )}

        {/* Xóa đơn nháp */}
        {order.status === 'DRAFT' && (
          <Button
            type='button'
            onClick={() => setDeleteOpen(true)}
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
            title='Xóa đơn nháp'
            aria-label='Xóa đơn nháp'
          >
            <IconTrash className='h-4 w-4' />
          </Button>
        )}
      </div>
    </>
  );
}
