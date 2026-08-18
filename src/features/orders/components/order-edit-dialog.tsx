'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { IconEdit } from '@tabler/icons-react';
import { useUpdateOrderMutation } from '../api/mutations';
import type { Order } from '../api/types';

interface OrderEditDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const updateMutation = useUpdateOrderMutation();

  const [totalQuantity, setTotalQuantity] = useState<number | ''>(order.totalQuantity ?? '');
  const [totalWeight, setTotalWeight] = useState<number | ''>(order.totalWeight ?? '');
  const [totalVolume, setTotalVolume] = useState<number | ''>(order.totalVolume ?? '');
  const [goodsDescription, setGoodsDescription] = useState(order.goodsDescription ?? '');
  const [notes, setNotes] = useState(order.notes ?? '');
  const [isExternalNeeded, setIsExternalNeeded] = useState(order.isExternalVehicleNeeded ?? false);
  const [externalNote, setExternalNote] = useState(order.externalNote ?? '');

  useEffect(() => {
    if (open) {
      setTotalQuantity(order.totalQuantity ?? '');
      setTotalWeight(order.totalWeight ?? '');
      setTotalVolume(order.totalVolume ?? '');
      setGoodsDescription(order.goodsDescription ?? '');
      setNotes(order.notes ?? '');
      setIsExternalNeeded(order.isExternalVehicleNeeded ?? false);
      setExternalNote(order.externalNote ?? '');
    }
  }, [open, order]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!totalWeight || Number(totalWeight) <= 0) {
      toast.error('Khối lượng phải lớn hơn 0 kg');
      return;
    }
    if (!totalVolume || Number(totalVolume) <= 0) {
      toast.error('Thể tích phải lớn hơn 0 m³');
      return;
    }
    if (isExternalNeeded && !externalNote.trim()) {
      toast.error('Vui lòng nhập ghi chú / lý do điều xe ngoài');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: order.id,
        payload: {
          totalQuantity: totalQuantity ? Number(totalQuantity) : null,
          totalWeight: Number(totalWeight),
          totalVolume: Number(totalVolume),
          goodsDescription: goodsDescription.trim() || undefined,
          notes: notes.trim() || undefined,
          isExternalVehicleNeeded: isExternalNeeded,
          externalNote: isExternalNeeded ? externalNote.trim() : undefined
        }
      });

      toast.success('Cập nhật đơn hàng thành công!');
      onOpenChange(false);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Lỗi cập nhật đơn hàng. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold flex items-center gap-2'>
            <IconEdit className='h-5 w-5 text-primary' />
            Chỉnh Sửa Đơn Hàng ({order.orderCode})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className='space-y-4 py-2'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div className='space-y-1.5'>
              <label
                htmlFor='edit-total-quantity-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Số lượng
              </label>
              <Input
                id='edit-total-quantity-input'
                type='number'
                min='1'
                step='1'
                value={totalQuantity}
                onChange={(e) =>
                  setTotalQuantity(e.target.value ? Number(e.target.value) : '')
                }
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='edit-total-weight-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Khối lượng (kg) <span className='text-rose-500'>*</span>
              </label>
              <Input
                id='edit-total-weight-input'
                type='number'
                min='1'
                step='1'
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='edit-total-volume-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Thể tích (m³) <span className='text-rose-500'>*</span>
              </label>
              <Input
                id='edit-total-volume-input'
                type='number'
                min='0.01'
                step='0.01'
                value={totalVolume}
                onChange={(e) => setTotalVolume(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label
              htmlFor='edit-goods-desc-input'
              className='text-sm font-semibold text-slate-700 dark:text-slate-300'
            >
              Mô tả loại hàng
            </label>
            <Textarea
              id='edit-goods-desc-input'
              rows={3}
              value={goodsDescription}
              onChange={(e) => setGoodsDescription(e.target.value)}
              className='resize-y'
            />
          </div>

          <div className='space-y-1.5'>
            <label
              htmlFor='edit-notes-input'
              className='text-sm font-semibold text-slate-700 dark:text-slate-300'
            >
              Ghi chú điều vận
            </label>
            <Textarea
              id='edit-notes-input'
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='resize-y'
            />
          </div>

          <div className='space-y-3 p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg'>
            <div className='flex items-center gap-2.5'>
              <input
                type='checkbox'
                id='edit-isExternalNeeded'
                checked={isExternalNeeded}
                onChange={(e) => setIsExternalNeeded(e.target.checked)}
                className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer'
              />
              <label
                htmlFor='edit-isExternalNeeded'
                className='text-xs text-amber-950 dark:text-amber-200 font-semibold cursor-pointer'
              >
                🚚 Yêu cầu điều xe ngoài / thuê ngoài đối tác (External Fleet)
              </label>
            </div>

            {isExternalNeeded && (
              <div className='space-y-1.5 pt-1 border-t border-amber-200/80 dark:border-amber-900/60'>
                <label
                  htmlFor='edit-external-note-input'
                  className='text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1'
                >
                  Ghi chú / Lý do điều xe ngoài <span className='text-rose-500'>*</span>
                </label>
                <Textarea
                  id='edit-external-note-input'
                  rows={2}
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  required={isExternalNeeded}
                  className='border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm resize-y'
                />
              </div>
            )}
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className='cursor-pointer'
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              disabled={updateMutation.isPending}
              className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer'
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
