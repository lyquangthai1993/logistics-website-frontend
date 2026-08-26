'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  IconPlus,
  IconSparkles,
  IconPackage,
  IconRoute,
  IconFileText,
  IconTruck
} from '@tabler/icons-react';
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

  // Build display label for a hub — include city in parens if not already present
  const getHubLabel = (hub: Hub): string => {
    if (hub.name.includes('(')) return hub.name;
    const cityShort =
      hub.city === 'TP. Hồ Chí Minh' || hub.city === 'Hồ Chí Minh' ? 'TP.HCM' : hub.city;
    return cityShort ? `${hub.name} (${cityShort})` : hub.name;
  };

  // Hub state now stores the full Hub object (for FK id) — falls back to null when only DEFAULT_HUBS available
  const [selectedOriginHub, setSelectedOriginHub] = useState<Hub | null>(null);
  const [selectedDestinationHub, setSelectedDestinationHub] = useState<Hub | null>(null);
  // Legacy string fallback for when activeHubs not loaded yet
  const [originHubFallback, setOriginHubFallback] = useState(DEFAULT_HUBS[0]);
  const [destinationHubFallback, setDestinationHubFallback] = useState(DEFAULT_HUBS[2]);

  // Form states
  const [orderCode, setOrderCode] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number | ''>('');
  const [totalWeight, setTotalWeight] = useState<number | ''>('');
  const [totalVolume, setTotalVolume] = useState<number | ''>('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isExternalNeeded, setIsExternalNeeded] = useState(false);
  const [externalNote, setExternalNote] = useState('');

  // Auto-select first/third hub when activeHubs loads
  useEffect(() => {
    if (activeHubs && activeHubs.length >= 2) {
      if (!selectedOriginHub) setSelectedOriginHub(activeHubs[0]);
      if (!selectedDestinationHub) {
        setSelectedDestinationHub(activeHubs[2] ?? activeHubs[1] ?? activeHubs[0]);
      }
    }
  }, [activeHubs, selectedOriginHub, selectedDestinationHub]);

  // Derived display values
  const originHubDisplay = selectedOriginHub ? getHubLabel(selectedOriginHub) : originHubFallback;
  const destinationHubDisplay = selectedDestinationHub
    ? getHubLabel(selectedDestinationHub)
    : destinationHubFallback;

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
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(apiMessage || 'Không thể sinh mã đơn hàng. Vui lòng thử lại.');
    }
  };

  const resetForm = () => {
    setOrderCode('');
    setSelectedOriginHub(activeHubs?.[0] ?? null);
    setSelectedDestinationHub(activeHubs?.[2] ?? activeHubs?.[1] ?? null);
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
    if (originHubDisplay === destinationHubDisplay) {
      toast.error('Điểm lấy hàng và điểm giao hàng không được trùng nhau');
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
      const originName = originHubDisplay;
      const destName = destinationHubDisplay;
      const route = `${originName.split(' ')[0]} → ${destName.split(' ')[0]}`;

      await createMutation.mutateAsync({
        orderCode: orderCode.trim().toUpperCase(),
        route,
        // String fields — kept for display/filter/legacy
        originHub: originName,
        destinationHub: destName,
        // FK fields — for targeted WM notification routing (Phase 1)
        originHubId: selectedOriginHub?.id ?? undefined,
        destinationHubId: selectedDestinationHub?.id ?? undefined,
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
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
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
      <DialogContent className='sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6 md:p-8'>
        <DialogHeader className='pb-3 border-b border-slate-100 dark:border-slate-800'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2.5 text-slate-900 dark:text-slate-100'>
            <span className='p-2 bg-primary/10 text-primary rounded-lg'>
              <IconPlus className='h-5 w-5' />
            </span>
            Tạo Lệnh Điều Vận Mới
          </DialogTitle>
          <p className='text-xs text-muted-foreground mt-1'>
            Khởi tạo đơn hàng điều phối giữa các chi nhánh kho và gửi yêu cầu xếp xe đến Đội xe
            (Fleet).
          </p>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className='space-y-6 py-3'>
          {/* KHỐI 1: MÃ ĐƠN & TUYẾN ĐƯỜNG */}
          <div className='bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4'>
            <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400'>
              <IconRoute className='h-4 w-4 text-primary' />
              Thông Tin Tuyến Đường & Định Danh
            </div>

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
                  className='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
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
                  className='font-mono uppercase font-semibold text-sm tracking-wide bg-white dark:bg-slate-950'
                />
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Định dạng gợi ý: [TIỀN TỐ]-[THÁNG NĂM]-[STT], ví dụ:{' '}
                <span className='font-mono font-medium'>{placeholderCode}</span>
              </p>
            </div>

            {/* Tuyến đường: Điểm lấy hàng & Điểm giao hàng */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-1'>
              <div className='space-y-1.5'>
                <label
                  htmlFor='origin-hub-select'
                  className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                >
                  Điểm lấy hàng (Kho gửi) <span className='text-rose-500'>*</span>
                </label>
                {activeHubs && activeHubs.length > 0 ? (
                  <select
                    id='origin-hub-select'
                    data-testid='origin-hub-select'
                    value={selectedOriginHub?.id ?? ''}
                    onChange={(e) => {
                      const hub = activeHubs.find((h) => h.id === Number(e.target.value)) ?? null;
                      setSelectedOriginHub(hub);
                    }}
                    className='w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all'
                  >
                    {activeHubs.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {getHubLabel(hub)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id='origin-hub-select'
                    data-testid='origin-hub-select'
                    value={originHubFallback}
                    onChange={(e) => setOriginHubFallback(e.target.value)}
                    className='w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all'
                  >
                    {DEFAULT_HUBS.map((hub) => (
                      <option key={hub} value={hub}>
                        {hub}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='destination-hub-select'
                  className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                >
                  Điểm giao hàng (Kho nhận) <span className='text-rose-500'>*</span>
                </label>
                {activeHubs && activeHubs.length > 0 ? (
                  <select
                    id='destination-hub-select'
                    data-testid='destination-hub-select'
                    value={selectedDestinationHub?.id ?? ''}
                    onChange={(e) => {
                      const hub = activeHubs.find((h) => h.id === Number(e.target.value)) ?? null;
                      setSelectedDestinationHub(hub);
                    }}
                    className='w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all'
                  >
                    {activeHubs.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {getHubLabel(hub)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id='destination-hub-select'
                    data-testid='destination-hub-select'
                    value={destinationHubFallback}
                    onChange={(e) => setDestinationHubFallback(e.target.value)}
                    className='w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all'
                  >
                    {DEFAULT_HUBS.map((hub) => (
                      <option key={hub} value={hub}>
                        {hub}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI 2: QUY CÁCH HÀNG HÓA */}
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
                    htmlFor='total-quantity-input'
                    className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                  >
                    Số lượng kiện
                  </label>
                  <span className='text-[10px] text-muted-foreground font-normal bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded'>
                    Tùy chọn
                  </span>
                </div>
                <Input
                  id='total-quantity-input'
                  type='number'
                  min='1'
                  step='1'
                  placeholder='VD: 3000 (kiện/cái)'
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value ? Number(e.target.value) : '')}
                  className='bg-white dark:bg-slate-950 font-medium'
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
                  className='bg-white dark:bg-slate-950 font-medium'
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
                  className='bg-white dark:bg-slate-950 font-medium'
                />
              </div>
            </div>
          </div>

          {/* KHỐI 3: MÔ TẢ & GHI CHÚ (2 CỘT RỘNG RÃI TRÊN DESKTOP) */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Mô tả hàng hóa */}
            <div className='space-y-1.5'>
              <label
                htmlFor='goods-desc-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'
              >
                <IconFileText className='h-4 w-4 text-slate-500' />
                Mô tả loại hàng hóa
              </label>
              <Textarea
                id='goods-desc-input'
                rows={6}
                placeholder='VD: 50 kiện hàng linh kiện điện tử nguyên đai nguyên kiện, hàng giá trị cao, yêu cầu bảo quản khô ráo...'
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                className='min-h-[140px] resize-y text-sm bg-white dark:bg-slate-950'
              />
            </div>

            {/* Ghi chú điều vận */}
            <div className='space-y-1.5'>
              <label
                htmlFor='notes-input'
                className='text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5'
              >
                <IconFileText className='h-4 w-4 text-slate-500' />
                Ghi chú điều vận & giao nhận
              </label>
              <Textarea
                id='notes-input'
                rows={6}
                placeholder='VD: Cần xe thùng kín có bửng nâng, giao trước 17h00, lái xe liên hệ thủ kho trước 30 phút...'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className='min-h-[140px] resize-y text-sm bg-white dark:bg-slate-950'
              />
            </div>
          </div>

          {/* KHỐI 4: YÊU CẦU XE NGOÀI */}
          <div className='space-y-3.5 p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900 rounded-xl transition-all'>
            <div className='flex items-center gap-3'>
              <input
                type='checkbox'
                id='isExternalNeeded'
                checked={isExternalNeeded}
                onChange={(e) => setIsExternalNeeded(e.target.checked)}
                className='h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer'
              />
              <label
                htmlFor='isExternalNeeded'
                className='text-sm text-amber-950 dark:text-amber-200 font-semibold cursor-pointer flex items-center gap-2'
              >
                <IconTruck className='h-4 w-4 text-amber-700 dark:text-amber-400' />
                Đơn hàng yêu cầu điều xe ngoài / thuê ngoài đối tác (External Fleet)
              </label>
            </div>

            {isExternalNeeded && (
              <div className='space-y-2 pt-2 border-t border-amber-200/80 dark:border-amber-900/60'>
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
                  className='border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 text-sm resize-y'
                />
                <p className='text-[11px] text-amber-800 dark:text-amber-300'>
                  Nội dung này sẽ được chuyển trực tiếp cho Quản lý Đội xe (Fleet) để thực hiện hợp
                  đồng thuê ngoài.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className='pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className='cursor-pointer px-5'
            >
              Hủy bỏ
            </Button>
            <Button
              type='submit'
              disabled={createMutation.isPending}
              className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 cursor-pointer px-6'
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
