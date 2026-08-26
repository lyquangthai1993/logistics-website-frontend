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
import { IconEdit, IconPackage, IconFileText, IconTruck } from '@tabler/icons-react';
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
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Lỗi cập nhật đơn hàng. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8'>
        <DialogHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2.5 text-slate-900 dark:text-slate-100'>
            <span className='p-2 bg-primary/10 text-primary rounded-lg'>
              <IconEdit className='h-5 w-5' />
            </span>
            Chỉnh Sửa Đơn Hàng &mdash;{' '}
            <span className='font-mono text-primary font-bold'>{order.orderCode}</span>
          </DialogTitle>
          <p className='text-xs text-muted-foreground mt-1'>
            Cập nhật lại quy cách hàng hóa, ghi chú điều vận hoặc thay đổi nhu cầu thuê xe ngoài.
          </p>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className='space-y-6 py-3'>
          {/* KHỐI 1: QUY CÁCH HÀNG HÓA */}
          <div className='bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400'>
                <IconPackage className='h-4 w-4 text-primary' />
                Quy Cách & Tải Trọng Hàng Hóa
              </div>
              <span className='text-[11px] text-muted-foreground font-normal'>
                Bắt buộc nhập Khối lượng & Thể tích
              </span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label
                    htmlFor='edit-total-quantity-input'
                    className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                  >
                    Số lượng kiện
                  </label>
                  <span className='text-[10px] text-muted-foreground font-normal bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded'>
                    Tùy chọn
                  </span>
                </div>
                <Input
                  id='edit-total-quantity-input'
                  type='number'
                  min='1'
                  step='1'
                  placeholder='VD: 3000'
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value ? Number(e.target.value) : '')}
                  className='bg-white dark:bg-slate-950 font-medium'
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
                  placeholder='VD: 18000'
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(e.target.value ? Number(e.target.value) : '')}
                  required
                  className='bg-white dark:bg-slate-950 font-medium'
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
                  placeholder='VD: 45.5'
                  value={totalVolume}
                  onChange={(e) => setTotalVolume(e.target.value ? Number(e.target.value) : '')}
                  required
                  className='bg-white dark:bg-slate-950 font-medium'
                />
              </div>
            </div>
          </div>

          {/* KHỐI 2: MÔ TẢ & GHI CHÚ (2 CỘT) */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='edit-goods-desc-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'
              >
                <IconFileText className='h-4 w-4 text-slate-500' />
                Mô tả loại hàng
              </label>
              <Textarea
                id='edit-goods-desc-input'
                rows={6}
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                className='min-h-[140px] resize-y text-sm bg-white dark:bg-slate-950'
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='edit-notes-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'
              >
                <IconFileText className='h-4 w-4 text-slate-500' />
                Ghi chú điều vận
              </label>
              <Textarea
                id='edit-notes-input'
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className='min-h-[140px] resize-y text-sm bg-white dark:bg-slate-950'
              />
            </div>
          </div>

          {/* KHỐI 3: YÊU CẦU XE NGOÀI */}
          <div className='space-y-3.5 p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900 rounded-xl'>
            <div className='flex items-center gap-3'>
              <input
                type='checkbox'
                id='edit-isExternalNeeded'
                checked={isExternalNeeded}
                onChange={(e) => setIsExternalNeeded(e.target.checked)}
                className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer'
              />
              <label
                htmlFor='edit-isExternalNeeded'
                className='text-sm text-amber-950 dark:text-amber-200 font-semibold cursor-pointer flex items-center gap-2'
              >
                <IconTruck className='h-4 w-4 text-amber-700 dark:text-amber-400' />
                Yêu cầu điều xe ngoài / thuê ngoài đối tác (External Fleet)
              </label>
            </div>

            {isExternalNeeded && (
              <div className='space-y-2 pt-2 border-t border-amber-200/80 dark:border-amber-900/60'>
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
                  className='border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 text-sm resize-y'
                />
              </div>
            )}
          </div>

          <DialogFooter className='pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className='cursor-pointer px-5'
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              disabled={updateMutation.isPending}
              className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer px-6'
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
