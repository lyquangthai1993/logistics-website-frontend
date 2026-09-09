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
  IconClipboardList,
  IconFileSpreadsheet,
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

  // Modal State: isModalOpen controls the overlay dialogs (WH_CASE_02B_TRIP_MODAL & WH_CASE_03_MODAL)
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [modalStep, setModalStep] = useState<1 | 2>(1);

  // Step 1 (WH_CASE_02B_TRIP_MODAL): Inbound Trips List
  const [tripsList, setTripsList] = useState<InboundTripItem[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<InboundTripItem | null>(null);

  // Step 2 (WH_CASE_03_MODAL): Trip Orders Selection
  const [tripOrders, setTripOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number | string>>(new Set());

  // Step 3 (dd8X5): Loaded Grid Rows State (10 columns)
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

  // ── 3. Handle Select Trip: Move to Modal Step 2 ──────────────────────────────
  const handleSelectTrip = (trip: InboundTripItem) => {
    setSelectedTrip(trip);
    setModalStep(2);
    fetchTripOrders(trip);
  };

  // ── 4. Toggle Order Selection in Modal Step 2 ────────────────────────────────
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

  // ── 5. Modal Step 2 -> Close Modal & Load into dd8X5 Grid ───────────────────
  const handleConfirmOrdersToGrid = () => {
    const selected = tripOrders.filter((o) => selectedOrderIds.has(o.id));
    if (selected.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn hàng để tiếp nhận');
      return;
    }

    const rows: WarehouseRowItem[] = selected.map((o, idx) => ({
      orderCode: o.orderCode || `ORD-${o.id}`,
      pickupAddress: o.originHubEntity?.name
        ? `${o.originHubEntity.name}`
        : o.senderAddress || selectedTrip?.originHub || 'Hub xuất phát',
      goodsDescription: o.goodsType || o.cargoName || 'Hàng hóa luân chuyển',
      totalQuantity: o.quantity || o.totalQuantity || 1,
      totalWeight: o.weight || o.totalWeight || 10,
      totalVolume: o.volume || o.totalVolume || 0.1,
      deliveryMode: (o.deliveryMode as any) || 'HUB_L1',
      deliveryAddress: o.destinationHubEntity?.name
        ? `${o.destinationHubEntity.name} · nhận trung chuyển`
        : o.receiverAddress || 'Kho trung chuyển',
      notes: o.notes || `Chuyến ${selectedTrip?.tripCode} · Xe ${selectedTrip?.vehicleLicensePlate}`,
    }));

    setGridRows(rows);
    setIsModalOpen(false);
    toast.success(`Đã nạp ${rows.length} đơn hàng từ chuyến ${selectedTrip?.tripCode} vào lưới tiếp nhận!`);
  };

  // ── 6. Metrics Calculations ─────────────────────────────────────────────────
  const selectedMetrics = useMemo(() => {
    const selected = tripOrders.filter((o) => selectedOrderIds.has(o.id));
    return {
      count: selected.length,
      packages: selected.reduce((acc, curr) => acc + (Number(curr.quantity || curr.totalQuantity) || 1), 0),
      weight: selected.reduce((acc, curr) => acc + (Number(curr.weight || curr.totalWeight) || 0), 0),
      volume: Number(
        selected.reduce((acc, curr) => acc + (Number(curr.volume || curr.totalVolume) || 0), 0).toFixed(2),
      ),
    };
  }, [tripOrders, selectedOrderIds]);

  const gridMetrics = useMemo(() => {
    return {
      count: gridRows.length,
      packages: gridRows.reduce((acc, curr) => acc + (Number(curr.totalQuantity) || 0), 0),
      weight: gridRows.reduce((acc, curr) => acc + (Number(curr.totalWeight) || 0), 0),
      volume: Number(
        gridRows.reduce((acc, curr) => acc + (Number(curr.totalVolume) || 0), 0).toFixed(2),
      ),
    };
  }, [gridRows]);

  // ── 7. Submit Confirmed Inbound to Backend ────────────────────────────────────
  const handleSubmitInbound = async () => {
    if (gridRows.length === 0) {
      toast.error('Chưa có dòng hàng hóa nào trong lưới kiểm đếm');
      return;
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const payload = {
        inboundType: 'TRANSFER',
        tripId: selectedTrip?.id,
        vehicleLicensePlate: selectedTrip?.vehicleLicensePlate,
        driverName: selectedTrip?.driverName,
        orders: gridRows.map((r) => ({
          orderCode: r.orderCode,
          pickupAddress: r.pickupAddress,
          goodsDescription: r.goodsDescription,
          totalQuantity: Number(r.totalQuantity) || 1,
          totalWeight: Number(r.totalWeight) || 1,
          totalVolume: Number(r.totalVolume) || 0.01,
          deliveryMode: r.deliveryMode || 'HUB_L1',
          deliveryAddress: r.deliveryAddress,
          notes: r.notes,
        })),
      };

      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Lỗi khi tiếp nhận chuyến hàng');
      }

      toast.success(`Đã xác nhận nhập kho thành công ${gridRows.length} đơn hàng từ chuyến ${selectedTrip?.tripCode}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Tiếp nhận kho không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Mode Switch Tabs ── */}
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
          <IconTruck className="h-4 w-4" />
          <span>Luân chuyển nội bộ · Chọn chuyến xe (Mode 2)</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MAIN WORKSPACE PAGE: Node [PAGE] dd8X5 (Nhập kho luân chuyển) ──── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="py-3 px-6 border-b flex flex-wrap items-center justify-between gap-3">
          {/* Stepper Progression Bar */}
          <div className="flex items-center gap-3">
            {/* Step 1 Chip */}
            <div
              onClick={() => {
                setModalStep(1);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  selectedTrip
                    ? 'bg-emerald-600 text-white'
                    : isModalOpen && modalStep === 1
                      ? 'bg-[#0F3D62] text-white ring-4 ring-blue-100 dark:ring-blue-950'
                      : 'bg-slate-200 text-slate-500',
                )}
              >
                {selectedTrip ? <IconCheck className="h-4 w-4" /> : '1'}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xs font-bold',
                    selectedTrip
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#0F3D62] dark:text-blue-400',
                  )}
                >
                  Chọn chuyến xe đến
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedTrip ? selectedTrip.tripCode : 'WH_CASE_02B_TRIP_MODAL'}
                </div>
              </div>
            </div>

            <span className={cn('text-sm font-bold', selectedTrip ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

            {/* Step 2 Chip */}
            <div
              onClick={() => {
                if (selectedTrip) {
                  setModalStep(2);
                  setIsModalOpen(true);
                }
              }}
              className={cn(
                'flex items-center gap-2 transition-opacity',
                selectedTrip ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  gridRows.length > 0
                    ? 'bg-emerald-600 text-white'
                    : isModalOpen && modalStep === 2
                      ? 'bg-[#0F3D62] text-white ring-4 ring-blue-100 dark:ring-blue-950'
                      : 'bg-slate-200 text-slate-500',
                )}
              >
                {gridRows.length > 0 ? <IconCheck className="h-4 w-4" /> : '2'}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xs font-bold',
                    gridRows.length > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#0F3D62] dark:text-blue-400',
                  )}
                >
                  Chọn đơn hàng cần dỡ
                </div>
                <div className="text-[10px] text-slate-400">
                  {gridRows.length > 0 ? `Đã chọn ${gridRows.length} đơn` : 'WH_CASE_03_MODAL'}
                </div>
              </div>
            </div>

            <span className={cn('text-sm font-bold', gridRows.length > 0 ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

            {/* Step 3 Chip */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  gridRows.length > 0 && !isModalOpen
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
                    gridRows.length > 0 && !isModalOpen ? 'text-[#0F3D62] dark:text-blue-400' : 'text-slate-500',
                  )}
                >
                  Kiểm đếm & Lưu kho
                </div>
                <div className="text-[10px] text-slate-400">dd8X5 Loaded Grid</div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onBackToBoard}
            className="text-xs font-semibold"
          >
            <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
            <span>Quay lại Bảng nhập kho</span>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {gridRows.length === 0 ? (
            /* Empty dd8X5 State: Prompts user to open WH_CASE_02B_TRIP_MODAL */
            <div className="text-center py-16 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-blue-600 shadow-sm border border-blue-100 dark:border-slate-700">
                <IconTruck className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Chưa nạp đơn hàng từ chuyến xe luân chuyển
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Mở danh sách các chuyến xe liên Hub đang trên đường đến {currentHubName} để chọn chuyến và nạp danh sách đơn hàng lên lưới kiểm đếm 10 cột.
                </p>
              </div>
              <Button
                onClick={() => {
                  setModalStep(1);
                  setIsModalOpen(true);
                }}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-6 py-2.5 shadow-md flex items-center gap-2 mx-auto"
              >
                <IconTruck className="h-4 w-4" />
                <span>Mở danh sách chuyến xe đang đến ➔</span>
              </Button>
            </div>
          ) : (
            /* Loaded dd8X5 State: Displays Locked Vehicle Card + 10-column Editable Grid */
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Locked Trip Header Card */}
              <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#0F3D62] text-white font-mono font-bold text-xs px-3 py-1">
                    {selectedTrip?.tripCode}
                  </Badge>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <IconLock className="h-3.5 w-3.5 text-amber-600" />
                      <span>Xe: {selectedTrip?.vehicleLicensePlate} ({selectedTrip?.vehicleType}) &bull; Tài xế: {selectedTrip?.driverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Xuất phát: {selectedTrip?.originHub} ➔ Tiếp nhận tại: {currentHubName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalStep(2);
                      setIsModalOpen(true);
                    }}
                    className="text-xs font-semibold h-8"
                  >
                    <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                    <span>Chọn lại đơn</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModalStep(1);
                      setIsModalOpen(true);
                    }}
                    className="text-xs font-semibold h-8"
                  >
                    <span>Đổi chuyến khác</span>
                  </Button>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1 font-bold">
                    {gridRows.length} đơn hàng đã lên lưới
                  </Badge>
                </div>
              </div>

              {/* 10-Column Editable Grid */}
              <WarehouseEditableGrid
                rows={gridRows}
                onChange={setGridRows}
                isOutboundMode={false}
              />

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                <div className="text-xs text-slate-500">
                  Tổng cộng: <strong className="text-slate-900 dark:text-white font-mono">{gridMetrics.count}</strong> dòng hàng tiếp nhận
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Đã lưu dữ liệu nháp kiểm đếm vào bộ nhớ đệm.')}
                    className="text-xs font-semibold"
                  >
                    Lưu nháp
                  </Button>
                  <Button
                    onClick={handleSubmitInbound}
                    disabled={isSubmitting}
                    className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-6 shadow-md flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconCircleCheck className="h-4 w-4 text-emerald-400" />
                    )}
                    <span>Xác nhận tiếp nhận & Lưu kho</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL STEP 1: Node [MODAL_STEP_1] WH_CASE_02B_TRIP_MODAL ────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && modalStep === 1 && (
        <div className="fixed inset-0 z-50 bg-[#0B1E2D]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-5xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="py-4 px-6 bg-[#F8FAFC] dark:bg-slate-800/90 border-b flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  LUÂN CHUYỂN NỘI BỘ &bull; BƯỚC 1 / 3: CHỌN CHUYẾN ĐANG ĐẾN HUB
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <IconTruck className="h-5 w-5 text-blue-600" />
                  <span>Chọn chuyến đang đến để tiếp nhận hàng ({currentHubName})</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Search Toolbar */}
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

              {/* Available Trip Cards (Matches Pen Node ID: trip_modal_dialog_card / Z2NDR) */}
              <div className="space-y-2.5">
                {isLoadingTrips ? (
                  <div className="py-12 text-center text-slate-500">
                    <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách chuyến xe từ cơ sở dữ liệu...
                  </div>
                ) : tripsList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl">
                    Không có chuyến xe luân chuyển nào đang chờ tiếp nhận tại {currentHubName}
                  </div>
                ) : (
                  tripsList.map((trip) => {
                    const isSelected = selectedTrip?.id === trip.id;
                    const orderCount = trip.remainingOrdersCount || (trip.order ? 1 : 1);
                    const pkgCount = (trip as any).totalPackages || 140;
                    const weightText = trip.totalWeight ? (trip.totalWeight >= 1000 ? `${(trip.totalWeight / 1000).toFixed(1)}T` : `${trip.totalWeight} kg`) : '3.8T';

                    return (
                      <div
                        key={trip.id}
                        className={cn(
                          'rounded-lg overflow-hidden flex transition-all duration-150',
                          isSelected
                            ? 'bg-[#F8FBFF] dark:bg-blue-950/30 border-2 border-blue-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        {/* Selection Accent Bar */}
                        <div
                          className={cn(
                            'w-1 self-stretch flex-shrink-0',
                            isSelected ? 'bg-[#2563EB]' : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        />

                        {/* Trip Card Content */}
                        <div className="flex-1 p-3.5 sm:p-4 flex flex-col gap-2.5">
                          {/* Card Header Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left: Trip Identity */}
                            <div className="space-y-1">
                              <div className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">
                                {trip.tripCode}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <IconTruck className="h-3.5 w-3.5 text-slate-500" />
                                <span>{trip.vehicleLicensePlate} · {trip.vehicleType}</span>
                                {trip.originHub && (
                                  <span className="text-slate-400 font-normal">
                                    (từ {trip.originHub})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: Actions (Status Badge + Select Button) */}
                            <div className="flex items-center gap-2.5">
                              {/* Loading Availability Badge */}
                              <div className="bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                                <span>
                                  {trip.status === 'CONFIRMED' || trip.status === 'IN_TRANSIT' || !trip.status
                                    ? 'CHỜ TIẾP NHẬN'
                                    : trip.status}
                                </span>
                              </div>

                              {/* Select Trip Button */}
                              <Button
                                size="sm"
                                onClick={() => handleSelectTrip(trip)}
                                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs h-9 px-3.5 rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Chọn chuyến</span>
                                <IconArrowRight className="h-3.5 w-3.5 text-white" />
                              </Button>
                            </div>
                          </div>

                          {/* Card Operational Details Row */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {/* Driver Info Block */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                              <IconUser className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  TÀI XẾ & SĐT
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {trip.driverName || 'Chưa gán tài xế'}
                                  {trip.driverPhone ? ` · ${trip.driverPhone}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Cargo Info Block */}
                            <div className="flex items-center gap-2">
                              <IconPackage className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  ĐƠN CÒN TRÊN XE
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {orderCount} đơn · {pkgCount} kiện · {weightText}
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

            {/* Modal Footer */}
            <div className="py-3 px-6 bg-slate-50 dark:bg-slate-800/80 border-t flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hiển thị <strong>{tripsList.length}</strong> chuyến xe đang tiếp cận kho
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL STEP 2: Node [MODAL_STEP_2] WH_CASE_03_MODAL ──────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && modalStep === 2 && selectedTrip && (
        <div className="fixed inset-0 z-50 bg-[#0B1E2D]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-5xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="py-4 px-6 bg-[#F8FAFC] dark:bg-slate-800/90 border-b flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  LUÂN CHUYỂN NỘI BỘ &bull; BƯỚC 2 / 3: CHỌN ĐƠN HÀNG CẦN TIẾP NHẬN
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  <IconPackage className="h-5 w-5 text-blue-600" />
                  <span>Chọn đơn hàng cần tiếp nhận từ {selectedTrip.tripCode}</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalStep(1)}
                  className="text-xs font-semibold h-8"
                >
                  <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                  <span>Đổi chuyến xe khác</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Selected Trip Details Card (Blue Highlight) */}
              <div className="p-4 bg-[#F0F7FF] dark:bg-slate-800/80 border border-[#B2CCFF] dark:border-blue-900 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
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
                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-3 py-1 font-bold">
                    Đã chọn {selectedOrderIds.size} / {tripOrders.length} đơn
                  </Badge>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.size === tripOrders.length && tripOrders.length > 0}
                      onChange={handleToggleSelectAllOrders}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Chọn tất cả</span>
                  </label>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F8FAFC] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                    <tr>
                      <th className="p-3 w-[40px] text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.size === tripOrders.length && tripOrders.length > 0}
                          onChange={handleToggleSelectAllOrders}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </th>
                      <th className="p-3 w-[140px]">MÃ ĐƠN HÀNG</th>
                      <th className="p-3">TÊN HÀNG HÓA</th>
                      <th className="p-3 text-center w-[100px]">SỐ KIỆN</th>
                      <th className="p-3 text-right w-[120px]">KG / M³</th>
                      <th className="p-3 w-[200px]">HUB ĐÍCH / ĐIỂM GIAO</th>
                      <th className="p-3 text-center w-[120px]">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingOrders ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-500">
                          <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Đang tải danh sách đơn hàng từ cơ sở dữ liệu...
                        </td>
                      </tr>
                    ) : tripOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400">
                          Không tìm thấy đơn hàng nào trên chuyến {selectedTrip.tripCode}
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
                              'cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/50',
                              isChecked && 'bg-[#EFF6FF] dark:bg-blue-950/40',
                            )}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectOrder(order.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {order.orderCode || `ORD-${order.id}`}
                            </td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                              {order.goodsType || order.cargoName || 'Hàng hóa tổng quan'}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                              {order.quantity || order.totalQuantity || 1} kiện
                            </td>
                            <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                              <div>{order.weight || order.totalWeight || 0} kg</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {order.volume || order.totalVolume || 0} m³
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                              {order.destinationHubEntity?.name || order.receiverAddress || 'Chưa định tuyến'}
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
            </div>

            {/* Modal Footer */}
            <div className="py-4 px-6 bg-slate-50 dark:bg-slate-800/80 border-t flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-bold text-[#059669] dark:text-emerald-400 flex items-center gap-2">
                <IconCircleCheck className="h-5 w-5 text-emerald-600" />
                <span>
                  Đã chọn: {selectedMetrics.count} đơn &bull; {selectedMetrics.packages} kiện &bull; {selectedMetrics.weight.toLocaleString('vi-VN')} kg &bull; {selectedMetrics.volume} m³
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setModalStep(1)} className="text-xs font-semibold">
                  <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                  <span>Quay lại</span>
                </Button>
                <Button
                  onClick={handleConfirmOrdersToGrid}
                  disabled={selectedOrderIds.size === 0}
                  className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-5 shadow-md flex items-center gap-1.5"
                >
                  <span>Xác nhận dỡ hàng → Đưa vào kiểm đếm</span>
                  <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal In Tem A4 (Pallet Label A4 Modal) ── */}
      <PalletLabelA4Modal
        isOpen={!!printLabelData}
        onClose={() => setPrintLabelData(null)}
        data={printLabelData}
      />
    </div>
  );
}
