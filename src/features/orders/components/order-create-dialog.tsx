'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { IconPlus, IconSparkles } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { activeHubsQueryOptions } from '@/features/hubs/api/queries';
import { useCreateOrderMutation, useGenerateOrderCodeMutation } from '../api/mutations';
import { DEFAULT_HUBS } from './orders-tables/options';
import type { Hub } from '@/features/hubs/api/types';

interface OrderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderCreateDialog({ open, onOpenChange }: OrderCreateDialogProps) {
  const { user } = useAuthStore();
  const createMutation = useCreateOrderMutation();
  const generateCodeMutation = useGenerateOrderCodeMutation();

  const { data: activeHubs } = useQuery(activeHubsQueryOptions());

  const hubOptions = useMemo(() => {
    if (activeHubs && activeHubs.length > 0) {
      return activeHubs.map((hub: Hub) => {
        if (hub.name.includes('(')) {
          return hub.name;
        }
        const cityShort =
          hub.city === 'TP. Hồ Chí Minh' || hub.city === 'Hồ Chí Minh'
            ? 'TP.HCM'
            : hub.city;
        return cityShort ? `${hub.name} (${cityShort})` : hub.name;
      });
    }
    return DEFAULT_HUBS;
  }, [activeHubs]);

  // Form states
  const [orderCode, setOrderCode] = useState('');
  const [originHub, setOriginHub] = useState(DEFAULT_HUBS[0]);
  const [destinationHub, setDestinationHub] = useState(DEFAULT_HUBS[2]);
  const [totalQuantity, setTotalQuantity] = useState<number | ''>('');
  const [totalWeight, setTotalWeight] = useState<number | ''>('');
  const [totalVolume, setTotalVolume] = useState<number | ''>('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isExternalNeeded, setIsExternalNeeded] = useState(false);
  const [externalNote, setExternalNote] = useState('');

  // Auto-select hubs when options load
  useEffect(() => {
    if (hubOptions.length >= 2) {
      if (!hubOptions.includes(originHub)) {
        setOriginHub(hubOptions[0]);
      }
      if (!hubOptions.includes(destinationHub)) {
        setDestinationHub(hubOptions[2] || hubOptions[1] || hubOptions[0]);
      }
    }
  }, [hubOptions, originHub, destinationHub]);

  const suggestedInitials = useMemo(() => {
    const name = (user?.firstName || '') + ' ' + (user?.lastName || '');
    const cleanName = name.trim();
    if (!cleanName) return 'ORD';

    const unaccented = cleanName
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const parts = unaccented.split(/\s+/).filter(Boolean);
    return (
      parts
        .map((p) => p[0]?.toUpperCase())
        .join('')
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 3) || 'ORD'
    );
  }, [user]);

  const placeholderCode = useMemo(() => {
    const date = new Date();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${suggestedInitials}-${mm}${yy}-001`;
  }, [suggestedInitials]);

  const handleGenerateCode = async () => {
    if (generateCodeMutation.isPending) return;
    try {
      const res = await generateCodeMutation.mutateAsync(suggestedInitials);
      setOrderCode(res.orderCode);
      toast.success(`Đã sinh mã: ${res.orderCode}`, { duration: 2000 });
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể sinh mã đơn hàng. Vui lòng thử lại.');
    }
  };

  const resetForm = () => {
    setOrderCode('');
    setTotalQuantity('');
    setTotalWeight('');
    setTotalVolume('');
    setGoodsDescription('');
    setNotes('');
    setIsExternalNeeded(false);
    setExternalNote('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderCode.trim()) {
      toast.error('Vui lòng nhập mã đơn hàng');
      return;
    }
    if (originHub === destinationHub) {
      toast.error('Hub xuất phát và Hub đích không được trùng nhau');
      return;
    }
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
      const route = `${originHub.split(' ')[0]} → ${destinationHub.split(' ')[0]}`;
      await createMutation.mutateAsync({
        orderCode: orderCode.trim().toUpperCase(),
        route,
        originHub,
        destinationHub,
        totalQuantity: totalQuantity ? Number(totalQuantity) : undefined,
        totalWeight: Number(totalWeight),
        totalVolume: Number(totalVolume),
        goodsDescription: goodsDescription.trim() || undefined,
        notes: notes.trim() || undefined,
        isExternalVehicleNeeded: isExternalNeeded,
        externalNote: isExternalNeeded ? externalNote.trim() : undefined
      });

      toast.success('Tạo lệnh điều vận thành công!');
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Lỗi tạo lệnh điều vận. Vui lòng thử lại.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold flex items-center gap-2'>
            <IconPlus className='h-5 w-5 text-primary' />
            Tạo Lệnh Điều Vận Mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className='space-y-4 py-2'>
          {/* Mã đơn hàng */}
          <div className='space-y-1.5'>
            <label
              htmlFor='order-code-input'
              className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between'
            >
              <span>
                Mã đơn hàng <span className='text-rose-500'>*</span>
              </span>
              <button
                type='button'
                onClick={handleGenerateCode}
                disabled={generateCodeMutation.isPending}
                className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-normal flex items-center gap-1 cursor-pointer disabled:opacity-50'
              >
                <IconSparkles className='h-3.5 w-3.5' />
                {generateCodeMutation.isPending ? 'Đang tạo...' : 'Tự động sinh mã'}
              </button>
            </label>
            <div className='relative'>
              <Input
                id='order-code-input'
                placeholder={placeholderCode}
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                required
                className='font-mono uppercase font-medium tracking-wide'
              />
            </div>
            <p className='text-[11px] text-slate-500 dark:text-slate-400'>
              Định dạng gợi ý: [TIỀN TỐ]-[THÁNG NĂM]-[STT], ví dụ: {placeholderCode}
            </p>
          </div>

          {/* Tuyến đường: Hub Xuất Phát & Hub Đích */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label
                htmlFor='origin-hub-select'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Hub xuất phát (Kho gửi) <span className='text-rose-500'>*</span>
              </label>
              <select
                id='origin-hub-select'
                value={originHub}
                onChange={(e) => setOriginHub(e.target.value)}
                className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
              >
                {hubOptions.map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='destination-hub-select'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Hub đích (Kho nhận) <span className='text-rose-500'>*</span>
              </label>
              <select
                id='destination-hub-select'
                value={destinationHub}
                onChange={(e) => setDestinationHub(e.target.value)}
                className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
              >
                {hubOptions.map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quy cách hàng hóa: Số lượng, Trọng lượng & Thể tích */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label
                  htmlFor='total-quantity-input'
                  className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                >
                  Số lượng
                </label>
                <span className='text-[10px] text-slate-400 font-normal'>Tùy chọn</span>
              </div>
              <Input
                id='total-quantity-input'
                type='number'
                min='1'
                step='1'
                placeholder='VD: 3000 (kiện/cái)'
                value={totalQuantity}
                onChange={(e) =>
                  setTotalQuantity(e.target.value ? Number(e.target.value) : '')
                }
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='total-weight-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Tổng khối lượng (kg) <span className='text-rose-500'>*</span>
              </label>
              <Input
                id='total-weight-input'
                type='number'
                min='1'
                step='1'
                placeholder='VD: 18000'
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='total-volume-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300'
              >
                Tổng thể tích (m³) <span className='text-rose-500'>*</span>
              </label>
              <Input
                id='total-volume-input'
                type='number'
                min='0.01'
                step='0.01'
                placeholder='VD: 45.5'
                value={totalVolume}
                onChange={(e) => setTotalVolume(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
          </div>
          <p className='text-[11px] text-slate-500 -mt-2'>
            * Khối lượng & Thể tích bắt buộc. <strong>Số lượng:</strong> để trống nếu là hàng theo lô / chuyến không đếm chiếc lẻ.
          </p>

          {/* Mô tả hàng hóa */}
          <div className='space-y-1.5'>
            <label
              htmlFor='goods-desc-input'
              className='text-sm font-semibold text-slate-700 dark:text-slate-300'
            >
              Mô tả loại hàng
            </label>
            <Textarea
              id='goods-desc-input'
              rows={3}
              placeholder='VD: 50 kiện hàng linh kiện điện tử nguyên đai nguyên kiện, hàng giá trị cao, yêu cầu bảo quản khô ráo...'
              value={goodsDescription}
              onChange={(e) => setGoodsDescription(e.target.value)}
              className='resize-y'
            />
          </div>

          {/* Ghi chú */}
          <div className='space-y-1.5'>
            <label
              htmlFor='notes-input'
              className='text-sm font-semibold text-slate-700 dark:text-slate-300'
            >
              Ghi chú điều vận
            </label>
            <Textarea
              id='notes-input'
              rows={3}
              placeholder='VD: Cần xe thùng kín có bửng nâng, giao trước 17h00, lái xe liên hệ thủ kho trước 30 phút...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='resize-y'
            />
          </div>

          {/* Flag yêu cầu xe thuê ngoài */}
          <div className='space-y-3 p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg'>
            <div className='flex items-center gap-2.5'>
              <input
                type='checkbox'
                id='isExternalNeeded'
                checked={isExternalNeeded}
                onChange={(e) => setIsExternalNeeded(e.target.checked)}
                className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer'
              />
              <label
                htmlFor='isExternalNeeded'
                className='text-xs text-amber-950 dark:text-amber-200 font-semibold cursor-pointer'
              >
                🚚 Đơn hàng yêu cầu điều xe ngoài / thuê ngoài đối tác (External Fleet)
              </label>
            </div>

            {isExternalNeeded && (
              <div className='space-y-1.5 pt-1 border-t border-amber-200/80 dark:border-amber-900/60'>
                <label
                  htmlFor='external-note-input'
                  className='text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1'
                >
                  Ghi chú / Lý do điều xe ngoài (external_note){' '}
                  <span className='text-rose-500'>* Bắt buộc</span>
                </label>
                <Textarea
                  id='external-note-input'
                  rows={2}
                  placeholder='VD: Đội xe nội bộ 15 tấn đang kín lịch trình; Cần thuê ngoài xe đầu kéo thùng kín từ đối tác Vận Tải Á Châu...'
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  required={isExternalNeeded}
                  className='border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm resize-y'
                />
                <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                  Nội dung này sẽ được chuyển trực tiếp cho Quản lý Đội xe (Fleet) để thực hiện hợp đồng thuê ngoài.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className='cursor-pointer'
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              disabled={createMutation.isPending}
              className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer'
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Lưu & Tạo lệnh'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrderCreateDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm self-start md:self-auto cursor-pointer'
      >
        <IconPlus className='mr-2 h-4 w-4' />
        Tạo lệnh điều vận mới
      </Button>
      <OrderCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
