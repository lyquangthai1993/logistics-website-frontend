'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconTruck,
  IconBuildingWarehouse,
  IconSearch,
  IconRefresh,
  IconPlus,
  IconArrowRight,
  IconArrowLeft,
  IconPrinter,
  IconCircleCheck,
  IconX,
  IconLoader2,
  IconLock,
  IconPackage,
  IconCheck,
  IconCalendar,
  IconUser,
  IconPhone,
  IconClock,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { WarehouseEditableGrid, WarehouseRowItem } from './warehouse-editable-grid';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface InboundTripItem {
  id: number;
  tripCode: string;
  vehicleLicensePlate: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  status: string;
  originHub: string;
  destinationHub: string;
  remainingOrdersCount: number;
  totalWeight: number;
  totalVolume: number;
  order?: any;
}

interface WarehouseInboundTransferFlowProps {
  onBackToBoard: () => void;
  onSwitchToCustomerMode: () => void;
  onSuccess: () => void;
}

export function WarehouseInboundTransferFlow({
  onBackToBoard,
  onSwitchToCustomerMode,
  onSuccess,
}: WarehouseInboundTransferFlowProps) {
  const user = useAuthStore((state) => state.user);
  const currentHubName = user?.hub?.name || 'Polaris Hub - Hưng Yên';

  // Active Step: 1 = Chọn chuyến xe (WH_CASE_02B_TRIP_MODAL), 2 = Chọn đơn hàng từ chuyến (WH_CASE_03_MODAL), 3 = Xác nhận lên lưới nhập kho (dd8X5)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Trips List State
  const [tripsList, setTripsList] = useState<InboundTripItem[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<InboundTripItem | null>(null);

  // Step 2: Trip Orders Selection State
  const [tripOrders, setTripOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number | string>>(new Set());

  // Step 3: Loaded Grid Rows State (10 columns in dd8X5)
  const [gridRows, setGridRows] = useState<WarehouseRowItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pallet Label A4 Modal
  const [printLabelData, setPrintLabelData] = useState<PalletLabelData | null>(null);

  // ── 1. Fetch Inbound Trips Approaching Current Hub (Real DB API) ─────────────
  const fetchTrips = useCallback(() => {
    setIsLoadingTrips(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      limit: '20',
      ...(tripSearch.trim() ? { search: tripSearch.trim() } : {}),
    });

    fetch(`/api/v1/warehouse/inbound-trips?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        const raw = resData?.data || [];
        setTripsList(raw);
      })
      .catch((err) => {
        console.error('Failed to fetch inbound trips from DB:', err);
        setTripsList([]);
      })
      .finally(() => setIsLoadingTrips(false));
  }, [tripSearch]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // ── 2. Fetch Orders for Selected Trip (Real DB API) ─────────────────────────
  const fetchTripOrders = useCallback(
    (trip: InboundTripItem) => {
      setIsLoadingOrders(true);
      const token = tokenManager.getAccessToken();
      const query = new URLSearchParams({
        limit: '50',
        ...(orderSearch.trim() ? { search: orderSearch.trim() } : {}),
      });

      fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((resData) => {
          const raw = resData?.data || [];
          setTripOrders(raw);
          // Select all available orders by default
          if (raw.length > 0) {
            setSelectedOrderIds(new Set(raw.map((o: any) => o.id)));
          } else {
            setSelectedOrderIds(new Set());
          }
        })
        .catch((err) => {
          console.error('Failed to fetch orders for trip from DB:', err);
          setTripOrders([]);
          setSelectedOrderIds(new Set());
        })
        .finally(() => setIsLoadingOrders(false));
    },
    [orderSearch],
  );

  // ── 3. Step 1 -> Step 2: Handle Trip Selection ──────────────────────────────
  const handleSelectTrip = (trip: InboundTripItem) => {
    setSelectedTrip(trip);
    setStep(2);
    fetchTripOrders(trip);
  };

  // ── 4. Step 2 Toggle Order Selection ─────────────────────────────────────────
  const handleToggleSelectOrder = (id: number | string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllOrders = () => {
    if (selectedOrderIds.size >= tripOrders.length && tripOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(tripOrders.map((o) => o.id)));
    }
  };

  // Selected orders summary metrics in Step 2
  const selectedOrdersList = useMemo(() => {
    return tripOrders.filter((o) => selectedOrderIds.has(o.id));
  }, [tripOrders, selectedOrderIds]);

  const selectedMetrics = useMemo(() => {
    const packages = selectedOrdersList.reduce((sum, o) => sum + (Number(o.totalQuantity) || 1), 0);
    const weight = selectedOrdersList.reduce((sum, o) => sum + (Number(o.totalWeight) || 0), 0);
    const volume = selectedOrdersList.reduce((sum, o) => sum + (Number(o.totalVolume) || 0), 0);
    return {
      count: selectedOrdersList.length,
      packages,
      weight,
      volume,
    };
  }, [selectedOrdersList]);

  // ── 5. Step 2 -> Step 3: Populate Loaded Grid Rows in dd8X5 ─────────────────
  const handleConfirmOrdersToGrid = () => {
    if (selectedOrderIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một đơn hàng để tiếp nhận!');
      return;
    }

    const rows: WarehouseRowItem[] = selectedOrdersList.map((o) => ({
      id: o.id,
      orderCode: o.orderCode || `LTV-${o.id}`,
      pickupAddress: o.originHub || selectedTrip?.originHub || 'Hub xuất phát',
      goodsDescription: o.goodsDescription || 'Hàng hóa luân chuyển',
      totalQuantity: Number(o.totalQuantity) || 1,
      totalWeight: Number(o.totalWeight) || 0,
      totalVolume: Number(o.totalVolume) || 0,
      deliveryMode: (o.destinationHub ? 'HUB_L1' : 'DIRECT_CUSTOMER') as any,
      deliveryAddress: o.destinationHub || o.deliveryAddress || currentHubName,
      notes: o.notes || `Chuyến ${selectedTrip?.tripCode} · Xe ${selectedTrip?.vehicleLicensePlate}`,
    }));

    setGridRows(rows);
    setStep(3);
    toast.success(`Đã nạp ${rows.length} đơn hàng từ chuyến ${selectedTrip?.tripCode} vào lưới tiếp nhận!`);
  };

  // ── 6. Step 3: Final Confirm Submit (Real DB API) ───────────────────────────
  const handleSubmitConfirmInbound = async () => {
    if (gridRows.length === 0) {
      toast.error('Không có đơn hàng nào trong danh sách để nhập kho!');
      return;
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();
    const orderIds = gridRows
      .map((r) => Number(r.id))
      .filter((id) => !isNaN(id) && id > 0);

    try {
      if (orderIds.length > 0) {
        const res = await fetch('/api/v1/warehouse/inbound/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderIds }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Lỗi khi xác nhận nhập kho');
        }
      }

      toast.success(
        `Xác nhận tiếp nhận thành công ${gridRows.length} đơn từ chuyến ${selectedTrip?.tripCode || ''} và lưu kho an toàn!`,
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu dữ liệu nhập kho vào cơ sở dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top View Switcher (Mới Khách Gửi vs Luân Chuyển Nội Bộ) ───────────── */}
      <div className="w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
        <button
          type="button"
          onClick={onSwitchToCustomerMode}
          className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white"
        >
          Mới hoàn toàn · Khách hàng đưa vào kho (Mode 1)
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 font-bold shadow-sm flex items-center justify-center gap-1.5"
        >
          <IconTruck className="h-3.5 w-3.5 text-blue-600" />
          <span>Luân chuyển nội bộ · Chọn chuyến xe (Mode 2)</span>
        </button>
      </div>

      {/* ── 3-Step Stepper Bar Header ────────────────────────────────────────── */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Step 1 */}
              <div
                onClick={() => setStep(1)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    step === 1
                      ? 'bg-[#0F3D62] text-white ring-4 ring-blue-100 dark:ring-blue-950'
                      : step > 1
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {step > 1 ? <IconCheck className="h-4 w-4" /> : '1'}
                </div>
                <div>
                  <div
                    className={cn(
                      'text-xs font-bold',
                      step === 1
                        ? 'text-[#0F3D62] dark:text-blue-400'
                        : step > 1
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500',
                    )}
                  >
                    Chọn chuyến xe đến
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedTrip ? selectedTrip.tripCode : 'WH_CASE_02B_TRIP_MODAL'}
                  </div>
                </div>
              </div>

              <span className={cn('text-sm font-bold', step >= 2 ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

              {/* Step 2 */}
              <div
                onClick={() => {
                  if (selectedTrip) setStep(2);
                }}
                className={cn('flex items-center gap-2', selectedTrip ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    step === 2
                      ? 'bg-[#0F3D62] text-white ring-4 ring-blue-100 dark:ring-blue-950'
                      : step > 2
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500',
                  )}
                >
                  {step > 2 ? <IconCheck className="h-4 w-4" /> : '2'}
                </div>
                <div>
                  <div
                    className={cn(
                      'text-xs font-bold',
                      step === 2
                        ? 'text-[#0F3D62] dark:text-blue-400'
                        : step > 2
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500',
                    )}
                  >
                    Chọn đơn hàng cần dỡ
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedOrderIds.size > 0 ? `Đã chọn ${selectedOrderIds.size} đơn` : 'WH_CASE_03_MODAL'}
                  </div>
                </div>
              </div>

              <span className={cn('text-sm font-bold', step >= 3 ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

              {/* Step 3 */}
              <div
                onClick={() => {
                  if (gridRows.length > 0) setStep(3);
                }}
                className={cn('flex items-center gap-2', gridRows.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    step === 3
                      ? 'bg-[#0F3D62] text-white ring-4 ring-blue-100 dark:ring-blue-950'
                      : 'bg-slate-200 text-slate-500',
                  )}
                >
                  3
                </div>
                <div>
                  <div
                    className={cn(
                      'text-xs font-bold',
                      step === 3 ? 'text-[#0F3D62] dark:text-blue-400' : 'text-slate-500',
                    )}
                  >
                    Kiểm đếm & Lưu kho
                  </div>
                  <div className="text-[10px] text-slate-400">dd8X5 Loaded Grid</div>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToBoard}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
              <span>Quay lại Bảng nhập kho</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 1: WH_CASE_02B_TRIP_MODAL (Chọn Chuyến Xe Đang Đến) ─────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md animate-in fade-in-50 duration-200">
          <CardHeader className="py-4 px-6 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <IconTruck className="h-5 w-5 text-blue-600" />
                <span>BƯỚC 1: CHỌN CHUYẾN XE LUÂN CHUYỂN ĐANG ĐẾN {currentHubName.toUpperCase()}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn một chuyến xe từ Hub xuất phát để chuẩn bị dỡ và tiếp nhận hàng hóa vào kho
              </p>
            </div>

            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs px-3 py-1 font-bold">
              {tripsList.length} chuyến xe đang tiếp cận
            </Badge>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[280px] max-w-md flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  placeholder="Tìm kiếm mã chuyến (TRIP-...), biển số xe, tài xế..."
                  className="pl-9 text-xs h-9"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTrips}
                disabled={isLoadingTrips}
                className="h-9 text-xs font-semibold"
              >
                <IconRefresh className={cn('mr-1.5 h-3.5 w-3.5', isLoadingTrips && 'animate-spin')} />
                <span>Làm mới danh sách</span>
              </Button>
            </div>

            {/* Trips Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="p-3 w-[150px]">MÃ CHUYẾN XE</th>
                    <th className="p-3 w-[220px]">PHƯƠNG TIỆN & TÀI XẾ</th>
                    <th className="p-3 w-[180px]">HUB XUẤT PHÁT</th>
                    <th className="p-3 text-right w-[150px]">TỔNG TẢI TRỌNG</th>
                    <th className="p-3 text-center w-[130px]">HÀNG TRÊN XE</th>
                    <th className="p-3 text-center w-[120px]">TRẠNG THÁI</th>
                    <th className="p-3 text-center w-[130px]">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingTrips ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Đang tải danh sách chuyến xe từ cơ sở dữ liệu...
                      </td>
                    </tr>
                  ) : tripsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Không có chuyến xe luân chuyển nào đang chờ tiếp nhận tại {currentHubName}
                      </td>
                    </tr>
                  ) : (
                    tripsList.map((trip) => {
                      const isSelected = selectedTrip?.id === trip.id;
                      return (
                        <tr
                          key={trip.id}
                          className={cn(
                            'hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors',
                            isSelected && 'bg-[#EFF6FF] dark:bg-blue-950/40 font-semibold',
                          )}
                        >
                          <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                            {trip.tripCode}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {trip.vehicleLicensePlate} ({trip.vehicleType})
                            </div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                              <IconUser className="h-3 w-3 text-slate-400" />
                              <span>{trip.driverName}</span>
                              {trip.driverPhone && <span>&bull; {trip.driverPhone}</span>}
                            </div>
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <IconBuildingWarehouse className="h-3.5 w-3.5 text-blue-500" />
                              <span>{trip.originHub}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                            <div>{trip.totalWeight?.toLocaleString('vi-VN')} kg</div>
                            <div className="text-[11px] text-slate-400 font-normal">{trip.totalVolume} m³</div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]">
                              {trip.remainingOrdersCount || 1} đơn hàng
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold"
                            >
                              {trip.status || 'IN_TRANSIT'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleSelectTrip(trip)}
                              className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs h-8 px-3 shadow-sm flex items-center gap-1"
                            >
                              <span>Chọn chuyến →</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 2: WH_CASE_03_MODAL (Chọn Đơn Hàng Cần Dỡ Từ Chuyến) ────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && selectedTrip && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md animate-in fade-in-50 duration-200">
          <CardHeader className="py-4 px-6 border-b flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <IconPackage className="h-5 w-5 text-blue-600" />
                <span>BƯỚC 2: CHỌN ĐƠN HÀNG CẦN TIẾP NHẬN TỪ {selectedTrip.tripCode}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tích chọn một hoặc nhiều đơn hàng có trên chuyến xe để dỡ và nhập kho kiểm đếm
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs font-semibold"
            >
              <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
              <span>Đổi chuyến xe khác</span>
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Selected Trip Details Card (Blue Highlight) */}
            <div className="p-4 bg-[#F0F7FF] dark:bg-slate-800/80 border border-[#B2CCFF] dark:border-blue-900 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  <IconTruck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-blue-800 dark:text-blue-300">
                      {selectedTrip.tripCode}
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px]">
                      {selectedTrip.status || 'IN_TRANSIT'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Xe: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTrip.vehicleLicensePlate}</span> &bull; Tài xế: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTrip.driverName}</span> ({selectedTrip.driverPhone})
                  </div>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">HUB XUẤT PHÁT</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTrip.originHub}</span>
              </div>
            </div>

            {/* Selection Counter & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[280px] max-w-md flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Tìm mã vận đơn, tên hàng..."
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-[#DCFCE7] text-[#059669] border-none text-xs px-3 py-1 font-bold rounded-full">
                  Đã chọn {selectedOrderIds.size} / {tripOrders.length} đơn
                </Badge>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.size >= tripOrders.length && tripOrders.length > 0}
                    onChange={handleToggleSelectAllOrders}
                    className="rounded text-blue-600 h-4 w-4 border-slate-300"
                  />
                  <span>Chọn tất cả</span>
                </label>
              </div>
            </div>

            {/* Orders Multi-Select Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.size >= tripOrders.length && tripOrders.length > 0}
                        onChange={handleToggleSelectAllOrders}
                        className="rounded text-blue-600 h-4 w-4 border-slate-300"
                      />
                    </th>
                    <th className="p-3 w-[160px]">MÃ ĐƠN HÀNG</th>
                    <th className="p-3 w-[220px]">TÊN HÀNG HÓA</th>
                    <th className="p-3 text-right w-[100px]">SỐ KIỆN</th>
                    <th className="p-3 text-right w-[130px]">KG / M³</th>
                    <th className="p-3 w-[200px]">HUB ĐÍCH / ĐIỂM GIAO</th>
                    <th className="p-3 text-center w-[120px]">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingOrders ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-500">
                        <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Đang tải danh sách đơn hàng từ chuyến xe...
                      </td>
                    </tr>
                  ) : tripOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Không có đơn hàng nào trong chuyến xe này
                      </td>
                    </tr>
                  ) : (
                    tripOrders.map((order) => {
                      const isChecked = selectedOrderIds.has(order.id);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => handleToggleSelectOrder(order.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isChecked
                              ? 'bg-[#EFF6FF] dark:bg-blue-950/40 hover:bg-blue-100/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                          )}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectOrder(order.id)}
                              className="rounded text-blue-600 h-4 w-4 border-slate-300"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                            {order.orderCode}
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {order.goodsDescription || 'Hàng hóa tổng quan'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                            {order.totalQuantity || 1} kiện
                          </td>
                          <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                            {Number(order.totalWeight)?.toLocaleString('vi-VN')} kg &bull; {order.totalVolume || 0} m³
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            {order.destinationHub || order.deliveryAddress || currentHubName}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold"
                            >
                              {order.status || 'Chờ dỡ'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary & Advance Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs font-bold text-[#059669] dark:text-emerald-400 flex items-center gap-2">
                <IconCircleCheck className="h-5 w-5 text-emerald-600" />
                <span>
                  Đã chọn: {selectedMetrics.count} đơn · {selectedMetrics.packages} kiện · {selectedMetrics.weight.toLocaleString('vi-VN')} kg · {selectedMetrics.volume} m³
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="text-xs font-semibold">
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmOrdersToGrid}
                  disabled={selectedOrderIds.size === 0}
                  className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-5 shadow-sm flex items-center gap-1.5"
                >
                  <span>Xác nhận dỡ hàng → Sang Bước 3</span>
                  <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 3: dd8X5 Loaded State (Kiểm Đếm Thực Tế & Lưu Kho) ─────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && selectedTrip && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Locked Trip Header Card */}
          <Card className="bg-[#F8FAFC] dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900 shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-[#0F3D62] text-white font-mono font-bold text-xs px-3 py-1">
                  {selectedTrip.tripCode}
                </Badge>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <IconLock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Xe: {selectedTrip.vehicleLicensePlate} ({selectedTrip.vehicleType}) &bull; Tài xế: {selectedTrip.driverName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Xuất phát: {selectedTrip.originHub} ➔ Tiếp nhận tại: {currentHubName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold h-8"
                >
                  <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                  <span>Chọn lại đơn</span>
                </Button>
                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                  {gridRows.length} đơn hàng đã lên lưới
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 10-Column Inbound Editable Grid */}
          <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 space-y-4">
              <WarehouseEditableGrid
                rows={gridRows}
                onChange={setGridRows}
                isOutboundMode={false}
              />

              {/* Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500">
                  Tổng cộng: {gridRows.length} dòng hàng tiếp nhận
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success('Đã lưu nháp bảng tiếp nhận nhập kho!')}
                    className="text-xs font-semibold h-9"
                  >
                    Lưu nháp
                  </Button>

                  <Button
                    onClick={handleSubmitConfirmInbound}
                    disabled={isSubmitting || gridRows.length === 0}
                    className="bg-[#0F3D62] hover:bg-[#0c314f] text-white px-6 font-bold shadow-md h-9 text-xs flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                        <span>Đang lưu vào DB...</span>
                      </>
                    ) : (
                      <>
                        <IconCircleCheck className="h-4 w-4 text-emerald-400" />
                        <span>Xác nhận tiếp nhận & Lưu kho</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pallet Label Modal */}
      <PalletLabelA4Modal
        isOpen={!!printLabelData}
        onClose={() => setPrintLabelData(null)}
        data={printLabelData}
      />
    </div>
  );
}
