'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import Link from 'next/link';
import { ordersApi, Order, OrderStatus, OrderStats } from '@/features/orders/api';
import { useAuthStore } from '@/stores/use-auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
  IconArrowRight,
  IconEye,
  IconInfoCircle,
  IconTruck,
  IconFileText,
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconCalendar,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';


const HUBS = [
  'Andromeda Hub (Hà Nội)',
  'Magellan Hub (Đà Nẵng)',
  'Centaurus Hub (TP.HCM)',
  'Pegasus Hub (Cần Thơ)',
  'Vela Hub (Hải Phòng)'
];

function renderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge
          variant='secondary'
          className='bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        >
          Nháp
        </Badge>
      );
    case 'PENDING_FLEET':
      return (
        <Badge
          variant='secondary'
          className='bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
        >
          Chờ điều xe
        </Badge>
      );
    case 'ASSIGNED':
      return (
        <Badge
          variant='secondary'
          className='bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
        >
          Đã phân xe
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge
          variant='secondary'
          className='bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
        >
          Đang vận chuyển
        </Badge>
      );
    case 'DELIVERED':
      return (
        <Badge
          variant='secondary'
          className='bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200'
        >
          Đã giao hàng
        </Badge>
      );
    case 'NO_VEHICLE':
      return (
        <Badge
          variant='destructive'
          className='bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
        >
          Không có xe
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant='outline' className='text-slate-400'>
          Đã hủy
        </Badge>
      );
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────
/** Trả về chuỗi YYYY-MM-DD theo local time (tránh timezone offset khi dùng toISOString) */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getThisMonthRange() {
  const now = new Date();
  return {
    from: toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toLocalDateString(now),
  };
}

function getLastMonthRange() {
  const now = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toLocalDateString(firstOfLastMonth), to: toLocalDateString(lastOfLastMonth) };
}

function getLast7DaysRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return { from: toLocalDateString(from), to: toLocalDateString(now) };
}

function getTodayRange() {
  const t = toLocalDateString(new Date());
  return { from: t, to: t };
}

type DatePreset = 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hubFilter, setHubFilter] = useState<string>('ALL');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Stats state (metric cards)
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [dateRange, setDateRange] = useState(getThisMonthRange());

  // Debounced search (300ms) để tránh spam request khi gõ
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal create order state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Per-row submit loading state — track by order id to avoid disabling all rows
  const [submittingOrderIds, setSubmittingOrderIds] = useState<Set<number>>(new Set());

  // Form states
  const [orderCode, setOrderCode] = useState('');
  const [originHub, setOriginHub] = useState(HUBS[0]);
  const [destinationHub, setDestinationHub] = useState(HUBS[2]);
  const [totalQuantity, setTotalQuantity] = useState<number | ''>('');
  const [totalWeight, setTotalWeight] = useState<number | ''>('');
  const [totalVolume, setTotalVolume] = useState<number | ''>('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isExternalNeeded, setIsExternalNeeded] = useState(false);
  const [externalNote, setExternalNote] = useState('');

  // Suggested initials for placeholder (loại bỏ dấu tiếng Việt)
  const suggestedInitials = useMemo(() => {
    const name = (user?.firstName || '') + ' ' + (user?.lastName || '');
    const cleanName = name.trim();
    if (!cleanName) return 'ORD';
    
    // Loại bỏ dấu tiếng Việt
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

  // Debounce search input — reset page về 1 khi search thay đổi
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(value);
    }, 300);
  };

  const loadOrders = async (currentPage = page) => {
    try {
      setLoading(true);
      const result = await ordersApi.getOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        originHub: hubFilter !== 'ALL' ? hubFilter : undefined,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      setOrders(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, hubFilter, debouncedSearch, dateRange]);

  // Khi đổi filter (không phải page), reset về trang 1
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleHubChange = (value: string) => {
    setHubFilter(value);
    setPage(1);
  };

  // ── Stats / Metric cards ───────────────────────────────────────────────────
  const loadStats = useCallback(async (from: string, to: string) => {
    try {
      setStatsLoading(true);
      const data = await ordersApi.getOrderStats(from, to);
      setStats(data);
    } catch {
      // Stats failure không block UI chính
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load stats khi dateRange thay đổi
  useEffect(() => {
    loadStats(dateRange.from, dateRange.to);
  }, [dateRange, loadStats]);

  // Preset selector
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset === 'today') setDateRange(getTodayRange());
    else if (preset === '7days') setDateRange(getLast7DaysRange());
    else if (preset === 'thisMonth') setDateRange(getThisMonthRange());
    else if (preset === 'lastMonth') setDateRange(getLastMonthRange());
    // 'custom' — user nhập trực tiếp, không thay dateRange ở đây
  };

  // Custom date input handler
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setDatePreset('custom');
    setPage(1);
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  // Format hiển thị ngày theo VI
  const formatDateVi = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) {
      toast.error('Vui lòng nhập mã đơn hàng');
      return;
    }
    if (originHub === destinationHub) {
      toast.error('Hub xuất phát và Hub đích không được trùng nhau');
      return;
    }
    if (!totalWeight || totalWeight <= 0) {
      toast.error('Khối lượng phải lớn hơn 0 kg');
      return;
    }
    if (!totalVolume || totalVolume <= 0) {
      toast.error('Thể tích phải lớn hơn 0 m³');
      return;
    }
    if (isExternalNeeded && !externalNote.trim()) {
      toast.error('Vui lòng nhập ghi chú / lý do điều xe ngoài', {
        description: 'Bắt buộc phải ghi nhận nội dung khi yêu cầu thuê ngoài đối tác.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const route = `${originHub.split(' ')[0]} → ${destinationHub.split(' ')[0]}`;
      await ordersApi.createOrder({
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
      setIsCreateModalOpen(false);
      // Reset form
      setOrderCode('');
      setTotalQuantity('');
      setTotalWeight('');
      setTotalVolume('');
      setGoodsDescription('');
      setNotes('');
      setIsExternalNeeded(false);
      setExternalNote('');
      loadOrders();
      refreshStats();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Lỗi tạo lệnh điều vận. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToFleet = async (id: number) => {
    // Guard: prevent double-click / duplicate request
    if (submittingOrderIds.has(id)) return;

    setSubmittingOrderIds((prev) => new Set(prev).add(id));
    try {
      await ordersApi.submitOrder(id);
      toast.success('Đã gửi lệnh điều vận lên Đội xe (Fleet)!');
      loadOrders();
      refreshStats();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể gửi lệnh điều vận. Vui lòng thử lại.');
    } finally {
      setSubmittingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy/xóa đơn hàng này?')) return;
    try {
      await ordersApi.deleteOrder(id);
      toast.success('Đã xóa đơn hàng thành công');
      loadOrders();
      refreshStats();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(apiMessage || 'Không thể xóa đơn hàng. Vui lòng thử lại.');
    }
  };

  // Refresh stats sau mỗi action (create/delete/submit) để metric cards cập nhật đúng
  const refreshStats = useCallback(() => {
    loadStats(dateRange.from, dateRange.to);
  }, [dateRange, loadStats]);

  // orders đã được filter từ server — dùng trực tiếp không cần client filter
  // metrics lấy từ API /orders/stats theo dateRange

  const handleOpenCreateModal = () => {
    setOrderCode('');
    setTotalQuantity('');
    setTotalWeight('');
    setTotalVolume('');
    setGoodsDescription('');
    setNotes('');
    setIsExternalNeeded(false);
    setExternalNote('');
    setIsCreateModalOpen(true);
  };

  const handleGenerateCode = async () => {
    if (generatingCode) return;
    setGeneratingCode(true);
    try {
      const { orderCode: generated } = await ordersApi.generateOrderCode(suggestedInitials);
      setOrderCode(generated);
      toast.success(`Đã sinh mã: ${generated}`, { duration: 2000 });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Không thể sinh mã đơn hàng. Vui lòng thử lại.');
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h2 className='text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100'>
            Lập Lệnh Điều Vận
          </h2>
          <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
            Quản lý kế hoạch vận chuyển hàng hóa, tạo đơn hàng và gửi yêu cầu phân bổ phương tiện.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm self-start md:self-auto'
        >
          <IconPlus className='mr-2 h-4 w-4' />
          Tạo lệnh điều vận mới
        </Button>
      </div>

      {/* ── Date Range Filter Bar (cho thống kê metric cards) ────────────── */}
      <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
        <CardContent className='pt-4 pb-3'>
          <div className='flex flex-wrap items-center gap-3'>
            {/* Label */}
            <div className='flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0'>
              <IconCalendar className='h-4 w-4' />
              Thống kê theo:
            </div>

            {/* Preset buttons */}
            <div className='flex items-center gap-1.5 flex-wrap'>
              {(
                [
                  { key: 'today', label: 'Hôm nay' },
                  { key: '7days', label: '7 ngày qua' },
                  { key: 'thisMonth', label: 'Tháng này' },
                  { key: 'lastMonth', label: 'Tháng trước' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md border transition-all duration-150 cursor-pointer',
                    datePreset === key
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-50'
                      : 'bg-transparent text-slate-600 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div className='flex items-center gap-2 ml-auto'>
              <span className='text-xs text-slate-400 hidden sm:inline'>Tùy chọn:</span>
              <input
                type='date'
                value={dateRange.from}
                max={dateRange.to}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
              />
              <span className='text-xs text-slate-400'>→</span>
              <input
                type='date'
                value={dateRange.to}
                min={dateRange.from}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                className='px-2 py-1 text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer'
              />
              <button
                onClick={() => loadStats(dateRange.from, dateRange.to)}
                disabled={statsLoading}
                title='Làm mới thống kê'
                className='p-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <IconRefresh className={cn('h-3.5 w-3.5 text-slate-500', statsLoading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Period label */}
          {stats && !statsLoading && (
            <p className='text-[11px] text-slate-400 dark:text-slate-500 mt-2 ml-0.5'>
              Kỳ thống kê: {formatDateVi(stats.fromDate)} – {formatDateVi(stats.toDate)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metric Cards — data từ API /orders/stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {/* Tổng đơn hàng */}
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-slate-600 dark:text-slate-400'>
              Tổng số đơn hàng
            </CardTitle>
            <IconFileText className='h-4 w-4 text-slate-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-slate-900 dark:text-slate-50'>
              {statsLoading ? (
                <span className='inline-block h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse' />
              ) : (
                stats?.total ?? '—'
              )}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Tổng trong kỳ đã chọn</p>
          </CardContent>
        </Card>

        {/* Chờ điều xe */}
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-blue-600 dark:text-blue-400'>
              Chờ điều phối xe
            </CardTitle>
            <IconClock className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
              {statsLoading ? (
                <span className='inline-block h-8 w-12 bg-blue-100 dark:bg-blue-950/50 rounded animate-pulse' />
              ) : (
                stats?.pending ?? '—'
              )}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Đã gửi yêu cầu lên Fleet</p>
          </CardContent>
        </Card>

        {/* Đã phân xe */}
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
              Đã phân công xe
            </CardTitle>
            <IconCircleCheck className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              {statsLoading ? (
                <span className='inline-block h-8 w-12 bg-emerald-100 dark:bg-emerald-950/50 rounded animate-pulse' />
              ) : (
                (stats ? stats.assigned + stats.inTransit : null) ?? '—'
              )}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Đã xác nhận + Đang vận chuyển</p>
          </CardContent>
        </Card>

        {/* Không có xe */}
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-rose-600 dark:text-rose-400'>
              Hết / Chưa có xe
            </CardTitle>
            <IconAlertTriangle className='h-4 w-4 text-rose-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
              {statsLoading ? (
                <span className='inline-block h-8 w-12 bg-rose-100 dark:bg-rose-950/50 rounded animate-pulse' />
              ) : (
                stats?.noVehicle ?? '—'
              )}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Cần tìm xe thuê ngoài</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
        <CardContent className='p-4 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4'>
          <div className='relative flex-1 max-w-md'>
            <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Tìm theo mã đơn, tuyến đường, hàng hóa...'
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-9 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'

            />
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className='px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
            >
              <option value='ALL'>Tất cả trạng thái</option>
              <option value='DRAFT'>Bản nháp (Draft)</option>
              <option value='PENDING_FLEET'>Chờ điều xe</option>
              <option value='ASSIGNED'>Đã phân xe</option>
              <option value='IN_TRANSIT'>Đang vận chuyển</option>
              <option value='NO_VEHICLE'>Không có xe</option>
              <option value='DELIVERED'>Đã giao hàng</option>
            </select>

            <select
              value={hubFilter}
              onChange={(e) => handleHubChange(e.target.value)}
              className='px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
            >
              <option value='ALL'>Tất cả các Hub</option>
              {HUBS.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className='shadow-sm border-slate-200/80 dark:border-slate-800 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium'>
              <tr>
                <th className='py-3 px-4'>Mã đơn hàng</th>
                <th className='py-3 px-4'>Tuyến đường & Hub</th>
                <th className='py-3 px-4'>Khối lượng / Thể tích</th>
                <th className='py-3 px-4'>Loại hàng</th>
                <th className='py-3 px-4'>Trạng thái</th>
                <th className='py-3 px-4'>Xe phân công</th>
                <th className='py-3 px-4 text-right'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-200 dark:divide-slate-800'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='text-center py-12 text-slate-400'>
                    Đang tải danh sách lệnh điều vận...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className='text-center py-12 text-slate-400'>
                    Không tìm thấy lệnh điều vận nào phù hợp.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const tripsCount = order.trips?.length || 0;
                  const isSplit = tripsCount > 1;
                  const hasExternalTrip =
                    order.trips?.some((t) => t.vehicle?.isExternal) ||
                    order.isExternalVehicleNeeded;

                  return (
                    <tr
                      key={order.id}
                      className='hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors'
                    >
                      <td className='py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100'>
                        <div className='flex items-center gap-2'>
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className='hover:underline text-blue-600 dark:text-blue-400 font-mono'
                          >
                            {order.orderCode}
                          </Link>
                          {isSplit && (
                            <Badge
                              variant='outline'
                              className='bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 text-[10px] px-1.5 py-0'
                            >
                              Split {tripsCount}x
                            </Badge>
                          )}
                          {hasExternalTrip && (
                            <Badge
                              variant='outline'
                              className='bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] px-1.5 py-0 font-bold'
                            >
                              Xe ngoài
                            </Badge>
                          )}
                        </div>
                        <span className='text-[11px] font-normal text-slate-400 block mt-0.5'>
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </td>

                      <td className='py-3.5 px-4 text-slate-700 dark:text-slate-300'>
                        <div className='font-medium flex items-center gap-1.5'>
                          <span>{order.originHub?.split(' ')[0] || 'N/A'}</span>
                          <IconArrowRight className='h-3.5 w-3.5 text-slate-400' />
                          <span>{order.destinationHub?.split(' ')[0] || 'N/A'}</span>
                        </div>
                        <span
                          className='text-xs text-slate-400 block mt-0.5 truncate max-w-[200px]'
                          title={`${order.originHub} → ${order.destinationHub}`}
                        >
                          {order.destinationHub}
                        </span>
                      </td>

                      <td className='py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono'>
                        <div className='font-medium'>{order.totalWeight.toLocaleString()} kg</div>
                        <div className='text-xs text-slate-400 flex items-center gap-1.5'>
                          <span>{order.totalVolume} m³</span>
                          {order.totalQuantity != null && (
                            <>
                              <span>•</span>
                              <span className='font-sans font-medium text-slate-600 dark:text-slate-400'>
                                {order.totalQuantity.toLocaleString()} kiện
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className='py-3.5 px-4 text-slate-600 dark:text-slate-400'>
                        <span
                          className='truncate block max-w-[180px]'
                          title={order.goodsDescription || 'Chưa có mô tả'}
                        >
                          {order.goodsDescription || '—'}
                        </span>
                        {order.externalNote && (
                          <span
                            className='text-[11px] text-amber-700 dark:text-amber-300 block truncate max-w-[180px] font-medium mt-0.5'
                            title={`Lý do xe ngoài: ${order.externalNote}`}
                          >
                            🚛 {order.externalNote}
                          </span>
                        )}
                      </td>

                      <td className='py-3.5 px-4'>{renderStatusBadge(order.status)}</td>

                      <td className='py-3.5 px-4 text-slate-700 dark:text-slate-300'>
                        {order.trips && order.trips.length > 0 ? (
                          <div className='space-y-1'>
                            {order.trips.map((t, idx) => (
                              <div key={t.id} className='text-xs flex items-center gap-1.5'>
                                <IconTruck className='h-3.5 w-3.5 text-slate-400' />
                                <span className='font-mono font-medium'>
                                  {t.vehicle?.licensePlate || `Chuyến #${idx + 1}`}
                                </span>
                                {t.vehicle?.isExternal && (
                                  <span className='text-[10px] text-amber-600 font-bold'>
                                    ({t.vehicle.externalProvider || 'Xe ngoài'})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className='text-xs text-slate-400 italic'>Chưa gán xe</span>
                        )}
                      </td>

                      <td className='py-3.5 px-4 text-right'>
                        <div className='flex items-center justify-end gap-1.5'>
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400'
                              title='Xem chi tiết đơn hàng'
                            >
                              <IconEye className='h-4 w-4' />
                            </Button>
                          </Link>

                          {order.status === 'NO_VEHICLE' && (
                            <Link href={`/dashboard/orders/${order.id}`}>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-8 px-2.5 text-xs text-amber-700 border-amber-300 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                title='Xử lý thuê xe ngoài'
                              >
                                <IconTruck className='h-3.5 w-3.5 mr-1 text-amber-600' />
                                Xe ngoài
                              </Button>
                            </Link>
                          )}

                          {(order.status === 'DRAFT' || order.status === 'NO_VEHICLE') && (
                            <Button
                              onClick={() => handleSubmitToFleet(order.id)}
                              variant='outline'
                              size='sm'
                              disabled={submittingOrderIds.has(order.id)}
                              className='h-8 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-60'
                              title='Gửi lệnh điều vận lên Đội xe'
                            >
                              {submittingOrderIds.has(order.id) ? (
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


                          {order.status === 'DRAFT' && (
                            <Button
                              onClick={() => handleDeleteOrder(order.id)}
                              variant='ghost'
                              size='sm'
                              className='h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              title='Xóa đơn nháp'
                            >
                              <IconTrash className='h-4 w-4' />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar — khớp style DataTablePagination của product page */}
        {!loading && totalPages > 0 && (
          <div className='border-t border-slate-200 dark:border-slate-800 px-4 py-2'>
            <TablePaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Modal / Dialog Tạo đơn mới */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2'>
              <IconFileText className='h-5 w-5 text-blue-600' />
              Tạo Lệnh Điều Vận Mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateOrder} className='space-y-4 pt-2'>
            {/* Mã đơn hàng */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label
                  htmlFor='order-code-input'
                  className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                >
                  Mã đơn hàng <span className='text-rose-500'>*</span>
                </label>
                <span className='text-xs text-slate-400 flex items-center gap-1'>
                  <IconInfoCircle className='h-3.5 w-3.5' />
                  Format gợi ý: [Tên tắt]-[MMYY]-[Số]
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Input
                  id='order-code-input'
                  placeholder={`VD: ${placeholderCode}`}
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                  required
                  className='font-mono uppercase text-base tracking-wide flex-1'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={handleGenerateCode}
                  disabled={generatingCode || submitting}
                  title='Sinh mã đơn hàng tự động'
                  className='shrink-0 h-10 w-10 border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors'
                >
                  {generatingCode ? (
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <IconSparkles className='h-4 w-4' />
                  )}
                </Button>
              </div>
              <p className='text-[11px] text-slate-500'>
                Tự nhập hoặc bấm{' '}
                <IconSparkles className='inline h-3 w-3 text-blue-500' />{' '}
                để sinh mã tạm thời tự động. Hệ thống kiểm tra trùng lặp.
              </p>
            </div>

            {/* Tuyến đường: Origin & Destination Hub */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label
                  htmlFor='origin-hub-select'
                  className='text-sm font-semibold text-slate-700 dark:text-slate-300'
                >
                  Hub xuất phát (Origin) <span className='text-rose-500'>*</span>
                </label>
                <select
                  id='origin-hub-select'
                  value={originHub}
                  onChange={(e) => setOriginHub(e.target.value)}
                  className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
                >
                  {HUBS.map((hub) => (
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
                  Hub tiếp nhận (Destination) <span className='text-rose-500'>*</span>
                </label>
                <select
                  id='destination-hub-select'
                  value={destinationHub}
                  onChange={(e) => setDestinationHub(e.target.value)}
                  className='w-full px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400'
                >
                  {HUBS.map((hub) => (
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
                  🚛 Đơn hàng yêu cầu điều xe ngoài / thuê ngoài đối tác (External Fleet)
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
                    Nội dung này sẽ được chuyển trực tiếp cho Quản lý Đội xe (Fleet) để thực hiện
                    hợp đồng thuê ngoài.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                Hủy bỏ
              </Button>
              <Button
                type='submit'
                disabled={submitting}
                className='bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900'
              >
                {submitting ? 'Đang tạo...' : 'Lưu & Tạo lệnh'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
