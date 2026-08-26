'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { IconTruck } from '@tabler/icons-react';
import { useUpdateOrderMutation } from '../api/mutations';
import type { Order } from '../api/types';

interface OrderExternalDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderExternalDialog({ order, open, onOpenChange }: OrderExternalDialogProps) {
  const updateMutation = useUpdateOrderMutation();
  const [externalNote, setExternalNote] = useState(order.externalNote ?? '');

  useEffect(() => {
    if (open) {
      setExternalNote(order.externalNote ?? '');
    }
  }, [open, order]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalNote.trim()) {
      toast.error('Vui lòng nhập ghi chú / lý do điều xe ngoài');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: order.id,
        payload: {
          isExternalVehicleNeeded: true,
          externalNote: externalNote.trim()
        }
      });

      toast.success('Đã cập nhật yêu cầu xe thuê ngoài!');
      onOpenChange(false);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Lỗi cập nhật yêu cầu xe ngoài. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-amber-700 dark:text-amber-400 flex items-center gap-2'>
            <IconTruck className='h-5 w-5' />
            Xử Lý Thuê Xe Ngoài (External Fleet)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className='space-y-4 py-2 text-sm'>
          <div className='text-muted-foreground space-y-2'>
            <p>
              Đơn hàng <strong className='text-foreground font-mono'>{order.orderCode}</strong> đang
              ở trạng thái <span className='text-rose-600 font-semibold'>Không có xe nội bộ</span>.
            </p>
            <p className='text-xs'>
              Cập nhật thông tin đối tác vận tải hoặc yêu cầu xe ngoài để Fleet Manager tiến hành ký
              gửi hợp đồng đối tác.
            </p>
          </div>

          <div className='space-y-1.5'>
            <label
              htmlFor='order-external-note-dialog'
              className='text-xs font-semibold text-slate-700 dark:text-slate-300'
            >
              Ghi chú đối tác / Loại xe yêu cầu <span className='text-rose-500'>*</span>
            </label>
            <Textarea
              id='order-external-note-dialog'
              rows={3}
              placeholder='VD: Xe 15 tấn thùng bạt đối tác Vận Tải Á Châu, giá cước thỏa thuận...'
              value={externalNote}
              onChange={(e) => setExternalNote(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className='cursor-pointer'
            >
              Hủy
            </Button>
            <Button
              type='submit'
              disabled={updateMutation.isPending}
              className='bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Xác Nhận Thuê Ngoài'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
