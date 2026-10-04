'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconTruck,
  IconSearch,
  IconRefresh,
  IconArrowRight,
  IconArrowLeft,
  IconCircleCheck,
  IconX,
  IconLoader2,
  IconLock,
  IconPackage,
  IconCheck,
  IconUser
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { toast } from 'sonner';
import { formatApiError, showApiErrorToast } from '@/lib/api-error';
import { formatWeight } from '@/lib/format';
import { cn } from '@/lib/utils';
import { tripManifestKeys, useTripManifestQuery } from '../api/trip-manifest';
import {
  WarehouseTripTallyTable,
  buildInitialTallyState,
  expectedForLine,
  type TallyState
} from './warehouse-trip-tally-table';
import { TripStopStatusBadge } from './trip-stop-status-badge';

export interface InboundTripItem {
  id: number;
  tripCode: string;
  vehicleLicensePlate: string;
  vehicleType?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  status?: string | null;
  /** Trip status as seen by the current hub (PENDING / COMPLETED) */
  hubStatus?: string | null;
  originHub?: string | null;
  destinationHub?: string | null;
  ordersCount?: number | null;
  remainingOrdersCount?: number | null;
  totalWeight?: number | null;
  totalVolume?: number | null;
}

interface WarehouseInboundTransferFlowProps {
  onBackToBoard: () => void;
  onSwitchToCustomerMode: () => void;
  onSuccess: () => void;
}

/**
 * Nhập kho hàng luân chuyển liên Hub:
 * 1. Chọn chuyến xe đang đến kho hiện tại.
 * 2. Kiểm đếm chọn lọc theo bảng kê chuyến — chỉ dỡ các dòng thuộc kho này,
 *    số liệu hợp đồng gốc chỉ xem, nhân viên kho nhập số kiện thực nhận.
 */
export function WarehouseInboundTransferFlow({
  onBackToBoard,
  onSwitchToCustomerMode,
  onSuccess
}: WarehouseInboundTransferFlowProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isTripModalOpen, setIsTripModalOpen] = useState(true);

  // Bước 1: danh sách chuyến đang đến kho
  const [tripsList, setTripsList] = useState<InboundTripItem[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<InboundTripItem | null>(null);

  // Bước 2: kiểm đếm theo bảng kê chuyến
  const [tally, setTally] = useState<TallyState>({});
  const [hideOtherHubs, setHideOtherHubs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: manifest,
    isLoading: isLoadingManifest,
    error: manifestError
  } = useTripManifestQuery(selectedTrip?.tripCode, !!selectedTrip);

  const currentHubName =
    user?.hub?.name ??
    manifest?.stops.find((s) => s.hubId === manifest.currentHubId)?.hubName ??
    'kho hiện tại';

  // ── 1. Chuyến xe đang đến kho hiện tại ──────────────────────────────────────
  const fetchTrips = useCallback(() => {
    setIsLoadingTrips(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      limit: '20',
      ...(tripSearch.trim() ? { search: tripSearch.trim() } : {})
    });

    fetch(`/api/v1/warehouse/inbound-trips?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: res.statusText }));
          throw { response: { data: errData, status: res.status } };
        }
        return res.json();
      })
      .then((resData) => setTripsList(resData?.data ?? []))
      .catch((err) => {
        setTripsList([]);
        showApiErrorToast(err, 'Không tải được danh sách chuyến xe đang đến');
      })
      .finally(() => setIsLoadingTrips(false));
  }, [tripSearch]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Khởi tạo trạng thái kiểm đếm khi bảng kê chuyến tải xong
  useEffect(() => {
    if (manifest) setTally(buildInitialTallyState(manifest.lines));
  }, [manifest]);

  const handleSelectTrip = (trip: InboundTripItem) => {
    setSelectedTrip(trip);
    setTally({});
    setHideOtherHubs(false);
    setIsTripModalOpen(false);
  };

  // ── 2. Tổng hợp kiểm đếm ────────────────────────────────────────────────────
  const pendingLines = useMemo(
    () => (manifest?.lines ?? []).filter((l) => !l.isReceivedHere),
    [manifest]
  );

  const isReadOnly =
    !manifest ||
    !manifest.currentHubId ||
    manifest.currentHubStatus === 'COMPLETED' ||
    pendingLines.length === 0;

  const tallySummary = useMemo(() => {
    const checked = pendingLines.filter((l) => tally[l.id]?.checked);
    return {
      count: checked.length,
      expected: checked.reduce((acc, l) => acc + expectedForLine(l), 0),
      actual: checked.reduce((acc, l) => {
        const v = tally[l.id]?.actualQuantity;
        return acc + (v === '' || v == null ? 0 : Number(v));
      }, 0),
      weight: checked.reduce((acc, l) => acc + (Number(l.totalWeight) || 0), 0)
    };
  }, [pendingLines, tally]);

  // ── 3. Xác nhận nhập kho các dòng đã chọn ───────────────────────────────────
  const handleSubmitInbound = async () => {
    if (!manifest || !selectedTrip) return;
    const selectedLines = pendingLines.filter((l) => tally[l.id]?.checked);

    if (selectedLines.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 dòng hàng dỡ xuống tại kho này!');
      return;
    }
    const licensePlate = (manifest.licensePlate || selectedTrip.vehicleLicensePlate || '').trim();
    if (!licensePlate) {
      toast.error('Chuyến xe chưa có biển số, vui lòng liên hệ điều phối để cập nhật!');
      return;
    }
    for (const l of selectedLines) {
      const s = tally[l.id];
      const qty = s.actualQuantity === '' ? 0 : Number(s.actualQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Đơn ${l.orderCode}: Số kiện thực nhận phải lớn hơn 0!`);
        return;
      }
      if (qty !== expectedForLine(l) && !s.discrepancyReason.trim()) {
        toast.error(`Đơn ${l.orderCode}: Vui lòng nhập lý do chênh lệch số kiện.`);
        return;
      }
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();
    try {
      const payload = {
        tripCode: manifest.tripCode,
        licensePlate: licensePlate.toUpperCase(),
        driverName: (manifest.driverName || selectedTrip.driverName || '').trim() || undefined,
        targetStatus: 'INBOUND',
        orders: selectedLines.map((l) => {
          const s = tally[l.id];
          const qty = Number(s.actualQuantity);
          return {
            id: l.id,
            orderCode: l.orderCode,
            actualQuantity: qty,
            expectedQuantity: expectedForLine(l),
            discrepancyReason: s.discrepancyReason.trim() || undefined,
            // Dòng nháp của kho này: số kiện thực nhận trở thành số kiện hợp đồng
            ...(l.isContractLocked ? {} : { totalQuantity: qty })
          };
        })
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      const body = await res.json().catch(() => null);
      const invoiceCode: string | undefined = body?.data?.invoiceCode ?? body?.invoiceCode;
      toast.success(
        `Đã nhập kho ${selectedLines.length} dòng hàng từ chuyến ${manifest.tripCode}${
          invoiceCode ? ` (phiếu ${invoiceCode})` : ''
        }.`
      );
      await queryClient.invalidateQueries({ queryKey: tripManifestKeys.all });
      onSuccess();
    } catch (err: any) {
      showApiErrorToast(err, 'Tiếp nhận kho không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepOneDone = !!selectedTrip;
  const stepTwoActive = !!selectedTrip && !isTripModalOpen;

  return (
    <div className='space-y-2'>
      {/* ── Chế độ nhập kho ── */}
      <div className='w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner'>
        <button
          type='button'
          onClick={onSwitchToCustomerMode}
          className='flex-1 py-1.5 px-2 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
        >
          Mới hoàn toàn
        </button>
        <button
          type='button'
          className='flex-1 py-1.5 px-2 rounded-lg text-xs transition-all bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 font-bold shadow-sm flex items-center justify-center gap-1.5'
        >
          <IconTruck className='h-4 w-4' />
          <span>Luân chuyển nội bộ</span>
        </button>
      </div>

      <Card className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm py-0'>
        <CardHeader className='py-1 px-1 border-b flex flex-wrap items-center justify-between gap-2'>
          {/* Thanh tiến trình 2 bước */}
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setIsTripModalOpen(true)}
              className='flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity text-left bg-transparent border-0 p-0'
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  stepOneDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0F3D62] text-white ring-2 ring-blue-100 dark:ring-blue-950'
                )}
              >
                {stepOneDone ? <IconCheck className='h-3.5 w-3.5' /> : '1'}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xs font-bold',
                    stepOneDone
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#0F3D62] dark:text-blue-400'
                  )}
                >
                  Chọn chuyến xe đến
                </div>
                <div className='text-[10px] text-slate-400'>
                  {selectedTrip ? selectedTrip.tripCode : 'Chưa chọn chuyến'}
                </div>
              </div>
            </button>

            <IconArrowRight
              className={cn('h-3.5 w-3.5', stepOneDone ? 'text-emerald-600' : 'text-slate-300')}
            />

            <div className='flex items-center gap-1.5'>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  stepTwoActive
                    ? 'bg-[#0F3D62] text-white ring-2 ring-blue-100 dark:ring-blue-950'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                2
              </div>
              <div>
                <div
                  className={cn(
                    'text-xs font-bold',
                    stepTwoActive ? 'text-[#0F3D62] dark:text-blue-400' : 'text-slate-500'
                  )}
                >
                  Kiểm đếm &amp; Nhập kho
                </div>
                <div className='text-[10px] text-slate-400'>
                  {stepTwoActive
                    ? `Đã chọn ${tallySummary.count} dòng dỡ tại kho`
                    : 'Dỡ hàng theo bảng kê chuyến'}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={onBackToBoard}
            className='text-xs font-semibold h-8'
          >
            <IconArrowLeft className='mr-1 h-3.5 w-3.5' />
            <span>Quay lại Bảng nhập kho</span>
          </Button>
        </CardHeader>

        <CardContent className='p-1'>
          {!selectedTrip ? (
            <div className='text-center py-2 space-y-2 max-w-md mx-auto'>
              <div className='w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-blue-600 border border-blue-100 dark:border-slate-700'>
                <IconTruck className='h-5 w-5' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-slate-800 dark:text-slate-100'>
                  Chưa chọn chuyến xe luân chuyển
                </h3>
                <p className='text-xs text-slate-500 mt-1 leading-relaxed'>
                  Chọn chuyến xe liên Hub đang đến {currentHubName} để mở bảng kê và kiểm đếm
                  các dòng hàng dỡ xuống tại kho.
                </p>
              </div>
              <Button
                onClick={() => setIsTripModalOpen(true)}
                className='bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs h-8 px-3 flex items-center gap-1.5 mx-auto'
              >
                <IconTruck className='h-4 w-4' />
                <span>Mở danh sách chuyến xe đang đến</span>
              </Button>
            </div>
          ) : (
            <div className='space-y-1.5 animate-in fade-in-50 duration-200'>
              {/* Thông tin chuyến đã chọn */}
              <div className='p-1.5 bg-[#F8FAFC] dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900 rounded-lg flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Badge className='bg-[#0F3D62] text-white font-mono font-bold text-[11px] px-2 py-0.5'>
                    {selectedTrip.tripCode}
                  </Badge>
                  <TripStopStatusBadge
                    status={
                      manifest?.currentHubStatus ?? selectedTrip.hubStatus ?? selectedTrip.status
                    }
                  />
                  <div>
                    <div className='text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5'>
                      <IconLock className='h-3.5 w-3.5 text-amber-600' />
                      <span>
                        Xe: {manifest?.licensePlate || selectedTrip.vehicleLicensePlate || '—'}
                        {selectedTrip.vehicleType ? ` (${selectedTrip.vehicleType})` : ''} &bull;
                        Tài xế: {manifest?.driverName || selectedTrip.driverName || '—'}
                      </span>
                    </div>
                    <div className='text-[10px] text-slate-500 mt-0.5'>
                      Xuất phát: {selectedTrip.originHub ?? '—'} &rarr; Tiếp nhận tại:{' '}
                      {currentHubName}
                    </div>
                  </div>
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsTripModalOpen(true)}
                  className='text-xs font-semibold h-8'
                >
                  Đổi chuyến khác
                </Button>
              </div>

              {/* Lộ trình các điểm dừng */}
              {manifest && manifest.stops.length > 0 && (
                <div className='flex flex-wrap items-center gap-1 text-[10px]'>
                  <span className='font-bold text-slate-500'>Lộ trình:</span>
                  {manifest.stops.map((s, idx) => (
                    <React.Fragment key={`${s.hubId}-${s.stopSequence}`}>
                      {idx > 0 && <IconArrowRight className='h-3 w-3 text-slate-300' />}
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded border font-semibold',
                          s.hubId === manifest.currentHubId
                            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                        )}
                      >
                        {s.hubName}
                      </span>
                      <TripStopStatusBadge status={s.status} />
                    </React.Fragment>
                  ))}
                </div>
              )}

              {isLoadingManifest ? (
                <div className='py-2 text-center text-xs text-slate-500'>
                  <IconLoader2 className='h-5 w-5 animate-spin mx-auto mb-1 text-blue-600' />
                  Đang tải bảng kê chuyến xe...
                </div>
              ) : manifestError ? (
                <div className='py-2 text-center text-xs text-rose-600 border border-dashed border-rose-200 rounded-lg'>
                  {formatApiError(manifestError, 'Không tải được bảng kê chuyến xe')}
                </div>
              ) : manifest ? (
                <>
                  {!manifest.currentHubId && (
                    <div className='p-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded'>
                      Tài khoản chưa được gán kho làm việc nên chỉ xem được bảng kê, không thể nhập kho.
                    </div>
                  )}
                  {manifest.currentHubId && isReadOnly && (
                    <div className='p-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded'>
                      Chuyến xe đã được xử lý tại {currentHubName}, không còn dòng hàng chờ dỡ.
                    </div>
                  )}
                  <WarehouseTripTallyTable
                    lines={manifest.lines}
                    state={tally}
                    onChange={setTally}
                    hideOtherHubs={hideOtherHubs}
                    onHideOtherHubsChange={setHideOtherHubs}
                    readOnly={isReadOnly}
                    currentHubName={currentHubName}
                  />
                </>
              ) : null}

              {/* Thanh thao tác cố định */}
              <div className='sticky bottom-0 bg-white dark:bg-slate-900 border-t p-1.5 flex flex-wrap items-center justify-between gap-2'>
                <div className='text-[10px] text-slate-600 dark:text-slate-300'>
                  Đã chọn{' '}
                  <strong className='font-mono text-slate-900 dark:text-white'>
                    {tallySummary.count}
                  </strong>{' '}
                  dòng &bull; Dự kiến dỡ{' '}
                  <strong className='font-mono'>{tallySummary.expected}</strong> kiện &bull; Thực
                  nhận{' '}
                  <strong
                    className={cn(
                      'font-mono',
                      tallySummary.actual !== tallySummary.expected && 'text-rose-600'
                    )}
                  >
                    {tallySummary.actual}
                  </strong>{' '}
                  kiện &bull; {formatWeight(tallySummary.weight)}
                </div>

                <Button
                  onClick={handleSubmitInbound}
                  disabled={isSubmitting || isReadOnly || tallySummary.count === 0}
                  className='bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs h-8 px-3 flex items-center gap-1.5'
                >
                  {isSubmitting ? (
                    <IconLoader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <IconCircleCheck className='h-3.5 w-3.5 text-emerald-400' />
                  )}
                  <span>Xác nhận nhập kho ({tallySummary.count} dòng)</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Hộp thoại chọn chuyến xe đang đến ── */}
      {isTripModalOpen && (
        <div className='fixed inset-0 z-50 bg-[#0B1E2D]/70 backdrop-blur-xs flex items-center justify-center p-2 animate-in fade-in duration-200'>
          <div className='max-w-5xl w-full bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]'>
            <div className='py-1.5 px-2 bg-[#F8FAFC] dark:bg-slate-800/90 border-b flex items-center justify-between'>
              <div>
                <div className='text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider'>
                  Luân chuyển nội bộ &bull; Bước 1 / 2: Chọn chuyến đang đến kho
                </div>
                <h2 className='text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5'>
                  <IconTruck className='h-4 w-4 text-blue-600' />
                  <span>Chọn chuyến đang đến để tiếp nhận hàng ({currentHubName})</span>
                </h2>
              </div>

              <button
                type='button'
                onClick={() => setIsTripModalOpen(false)}
                aria-label='Đóng'
                className='w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors'
              >
                <IconX className='h-3.5 w-3.5' />
              </button>
            </div>

            <div className='p-2 space-y-1.5 overflow-y-auto flex-1'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='relative min-w-[280px] max-w-md flex-1'>
                  <IconSearch className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400' />
                  <Input
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder='Tìm mã chuyến (SD...), biển số xe, tài xế...'
                    className='pl-8 text-xs h-8'
                  />
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={fetchTrips}
                  disabled={isLoadingTrips}
                  className='h-8 text-xs font-semibold'
                >
                  <IconRefresh
                    className={cn('mr-1.5 h-3.5 w-3.5', isLoadingTrips && 'animate-spin')}
                  />
                  <span>Làm mới danh sách</span>
                </Button>
              </div>

              <div className='space-y-1.5'>
                {isLoadingTrips ? (
                  <div className='py-2 text-center text-xs text-slate-500'>
                    <IconLoader2 className='h-5 w-5 animate-spin mx-auto mb-1 text-blue-600' />
                    Đang tải danh sách chuyến xe...
                  </div>
                ) : tripsList.length === 0 ? (
                  <div className='py-2 text-center text-xs text-slate-400 border border-dashed rounded-lg'>
                    Không có chuyến xe luân chuyển nào đang chờ tiếp nhận tại {currentHubName}
                  </div>
                ) : (
                  tripsList.map((trip) => {
                    const isSelected = selectedTrip?.id === trip.id;
                    const remaining = trip.remainingOrdersCount ?? 0;
                    const total = trip.ordersCount ?? remaining;

                    return (
                      <div
                        key={trip.id}
                        className={cn(
                          'rounded-lg overflow-hidden flex transition-all duration-150',
                          isSelected
                            ? 'bg-[#F8FBFF] dark:bg-blue-950/30 border border-blue-500 border-l-4 border-l-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className='flex-1 p-1.5 flex flex-col gap-1.5'>
                          <div className='flex flex-wrap items-center justify-between gap-2'>
                            <div className='space-y-0.5'>
                              <div className='text-[11px] font-bold text-blue-700 dark:text-blue-400 font-mono'>
                                {trip.tripCode}
                              </div>
                              <div className='flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300'>
                                <IconTruck className='h-3.5 w-3.5 text-slate-500' />
                                <span>
                                  {trip.vehicleLicensePlate || '—'}
                                  {trip.vehicleType ? ` · ${trip.vehicleType}` : ''}
                                </span>
                                {trip.originHub && (
                                  <span className='text-slate-400 font-normal'>
                                    (từ {trip.originHub})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className='flex items-center gap-2'>
                              <TripStopStatusBadge status={trip.hubStatus ?? trip.status} />
                              <Button
                                size='sm'
                                onClick={() => handleSelectTrip(trip)}
                                className='bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs h-8 px-3 flex items-center gap-1.5'
                              >
                                <span>Chọn chuyến</span>
                                <IconArrowRight className='h-3.5 w-3.5 text-white' />
                              </Button>
                            </div>
                          </div>

                          <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80'>
                            <div className='flex items-center gap-1.5 flex-1 min-w-[200px]'>
                              <IconUser className='h-3.5 w-3.5 text-slate-400 flex-shrink-0' />
                              <div className='flex flex-col'>
                                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
                                  Tài xế &amp; SĐT
                                </span>
                                <span className='text-xs font-semibold text-slate-700 dark:text-slate-200'>
                                  {trip.driverName || 'Chưa gán tài xế'}
                                  {trip.driverPhone ? ` · ${trip.driverPhone}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-1.5'>
                              <IconPackage className='h-3.5 w-3.5 text-slate-400 flex-shrink-0' />
                              <div className='flex flex-col'>
                                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
                                  Đơn chờ dỡ tại kho
                                </span>
                                <span className='text-xs font-semibold text-slate-700 dark:text-slate-200'>
                                  {remaining} / {total} đơn &bull; {formatWeight(trip.totalWeight ?? 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className='py-1.5 px-2 bg-slate-50 dark:bg-slate-800/80 border-t flex items-center justify-between'>
              <span className='text-[10px] text-slate-500'>
                Hiển thị <strong>{tripsList.length}</strong> chuyến xe đang đến kho
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsTripModalOpen(false)}
                className='text-xs font-semibold h-7'
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
