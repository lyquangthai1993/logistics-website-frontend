'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IconTruckOff, IconAlertTriangle } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useNoVehicleMutation } from '../api/mutations';
import type { Order } from '@/features/orders/api/types';

interface NoVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

const REASON_CATEGORIES = [
  {
    id: 'BUSY',
    label: 'Toàn bộ xe nội bộ phù hợp đang trong lộ trình vận chuyển'
  },
  {
    id: 'MAINTENANCE',
    label: 'Xe đang trong kế hoạch bảo dưỡng, kiểm định kỹ thuật'
  },
  {
    id: 'OVER_CAPACITY',
    label: 'Khối lượng / thể tích vượt quá tải trọng của xe khả dụng'
  },
  {
    id: 'HUB_UNAVAILABLE',
    label: 'Không có xe khả dụng tại Hub xuất phát này'
  },
  {
    id: 'CUSTOM',
    label: 'Lý do khác / Khuyến nghị điều xe ngoài cụ thể'
  }
];

export function NoVehicleDialog({
  open,
  onOpenChange,
  order,
  onSuccess
}: NoVehicleDialogProps) {
  const [reasonCategory, setReasonCategory] = useState('BUSY');
  const [customReason, setCustomReason] = useState('');
  const noVehicleMutation = useNoVehicleMutation();

  const handleConfirm = async () => {
    if (!order) return;

    try {
      const reasonLabels: Record<string, string> = {
        BUSY: 'Toàn bộ xe nội bộ phù hợp đang trong lộ trình vận chuyển',
        MAINTENANCE: 'Xe đang trong kế hoạch bảo dưỡng, kiểm định kỹ thuật',
        OVER_CAPACITY: 'Khối lượng / thể tích vượt quá tải trọng của xe khả dụng',
        HUB_UNAVAILABLE: 'Không có xe khả dụng tại Hub xuất phát này',
        CUSTOM: 'Khác'
      };

      const baseReason = reasonLabels[reasonCategory] || 'Hết xe';
      const finalReason = customReason.trim()
        ? `${baseReason}. Chi tiết: ${customReason.trim()}`
        : baseReason;

      await noVehicleMutation.mutateAsync({
        orderId: order.id,
        reason: finalReason
      });

      toast.warning(`Đã báo hết xe cho đơn ${order.orderCode}`, {
        description:
          'Bộ phận Điều phối (Dispatcher) đã được cập nhật để chủ động thuê xe ngoài.'
      });

      onOpenChange(false);
      setCustomReason('');
      setReasonCategory('BUSY');
      onSuccess?.();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Lỗi cập nhật trạng thái hết xe. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'>
              <IconTruckOff className='h-6 w-6' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-slate-900 dark:text-slate-100'>
                Xác Nhận Báo Hết Xe Nội Bộ
              </DialogTitle>
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>
                Thông báo cho người điều phối (Dispatcher) rằng Đội xe không thể bố trí phương tiện
                nội bộ.
              </p>
            </div>
          </div>
        </DialogHeader>

        {order && (
          <div className='space-y-4 pt-2'>
            {/* Order summary card */}
            <div className='p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='font-mono font-bold text-sm text-slate-900 dark:text-slate-100'>
                  {order.orderCode}
                </span>
                <Badge
                  variant='outline'
                  className='bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-semibold'
                >
                  Chờ phân xe
                </Badge>
              </div>
              <div className='text-xs text-slate-600 dark:text-slate-300 font-medium'>
                📍 Tuyến:{' '}
                <span className='font-semibold'>
                  {order.originHub} &rarr; {order.destinationHub}
                </span>
              </div>
              <div className='flex items-center gap-4 text-xs text-slate-500 font-mono'>
                <span>
                  ⚖️ Khối lượng:{' '}
                  <strong className='text-slate-700 dark:text-slate-300'>
                    {order.totalWeight.toLocaleString()} kg
                  </strong>
                </span>
                <span>
                  📦 Thể tích:{' '}
                  <strong className='text-slate-700 dark:text-slate-300'>
                    {order.totalVolume} m³
                  </strong>
                </span>
              </div>
              {order.goodsDescription && (
                <div className='text-xs text-slate-500 italic truncate'>
                  Loại hàng: {order.goodsDescription}
                </div>
              )}
            </div>

            {/* Reason options */}
            <div className='space-y-2'>
              <div className='text-xs font-bold text-slate-700 dark:text-slate-300 block'>
                Lý do không thể bố trí xe <span className='text-rose-500'>*</span>
              </div>
              <div className='space-y-1.5'>
                {REASON_CATEGORIES.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      reasonCategory === item.id
                        ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type='radio'
                      name='noVehicleReason'
                      value={item.id}
                      checked={reasonCategory === item.id}
                      onChange={() => setReasonCategory(item.id)}
                      className='text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer'
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom reason / detail note */}
            <div className='space-y-1.5'>
              <label
                htmlFor='no-vehicle-custom-reason'
                className='text-xs font-semibold text-slate-700 dark:text-slate-300'
              >
                Ghi chú chi tiết / Khuyến nghị gửi đến Người điều phối (Dispatcher):
              </label>
              <Textarea
                id='no-vehicle-custom-reason'
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder='VD: Toàn bộ xe tải 15T đang chạy tuyến Huế - SG đến 20/08. Đề nghị Dispatcher chủ động thuê xe ngoài để kịp tiến độ khách hàng...'
                className='text-xs resize-none'
              />
            </div>

            {/* Informative advice banner */}
            <div className='p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1'>
              <div className='font-bold flex items-center gap-1.5'>
                <span>💡 Hướng dẫn nghiệp vụ:</span>
              </div>
              <p className='text-[11px] leading-relaxed text-amber-700 dark:text-amber-400'>
                Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái{' '}
                <strong>&quot;Không có xe&quot; (NO_VEHICLE)</strong>. Người điều phối sẽ nhận được
                phản hồi để kịp thời liên hệ đối tác vận tải ngoài (External Fleet) hoặc đổi lịch
                trình.
              </p>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={noVehicleMutation.isPending}
                className='cursor-pointer'
              >
                Hủy bỏ
              </Button>
              <Button
                type='button'
                onClick={handleConfirm}
                disabled={noVehicleMutation.isPending}
                className='bg-rose-600 hover:bg-rose-700 text-white cursor-pointer font-semibold'
              >
                <IconAlertTriangle className='h-4 w-4 mr-1.5' />
                {noVehicleMutation.isPending ? 'Đang gửi...' : 'Xác nhận báo hết xe'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
