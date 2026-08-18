'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useDeleteOrderMutation } from '../api/mutations';
import type { Order } from '../api/types';

interface OrderDeleteDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDeleteDialog({ order, open, onOpenChange }: OrderDeleteDialogProps) {
  const deleteMutation = useDeleteOrderMutation();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(order.id);
      toast.success('Đã xóa đơn hàng thành công');
      onOpenChange(false);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể xóa đơn hàng. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[460px]'>
        <DialogHeader>
          <DialogTitle className='text-destructive flex items-center gap-2'>
            <IconAlertTriangle className='h-5 w-5' />
            Xác Nhận Hủy / Xóa Đơn Hàng
          </DialogTitle>
        </DialogHeader>
        <div className='text-muted-foreground space-y-3 py-2 text-sm'>
          <p>
            Bạn có chắc chắn muốn hủy / xóa đơn hàng{' '}
            <strong className='text-foreground font-semibold font-mono'>
              {order.orderCode}
            </strong>
            ?
          </p>
          <p className='text-muted-foreground text-xs'>
            Hệ thống áp dụng chính sách <strong>Xóa Mềm (Soft Delete)</strong>. Lịch sử giao dịch và vết kiểm toán vẫn được bảo toàn trong cơ sở dữ liệu.
          </p>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='cursor-pointer'
          >
            Hủy
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            className='cursor-pointer'
          >
            {deleteMutation.isPending ? 'Đang Xóa...' : 'Xác Nhận Xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
