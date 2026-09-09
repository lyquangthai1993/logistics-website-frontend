'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconTruck,
  IconBuildingWarehouse,
  IconMapPin,
  IconCalendar,
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
  IconPackageImport,
  IconInbox,
  IconCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { PalletLabelA4Modal, PalletLabelData } from './pallet-label-a4-modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface HubOption {
  id: number;
  code: string;
  name: string;
  city: string;
  level: number;
}

export interface StoredOrderItem {
  id: number | string;
  orderCode: string;
  goodsDescription: string;
  totalQuantity: number;
  totalWeight: number;
  totalVolume: number;
  status: string;
  createdAt: string;
  destinationHub?: string;
  deliveryAddress?: string;
  originHub?: string;
}

interface WarehouseOutboundTransferFlowProps {
  onBackToBoard: () => void;
  onSwitchToCustomerMode: () => void;
  onSuccess: () => void;
}

export function WarehouseOutboundTransferFlow({
  onBackToBoard,
  onSwitchToCustomerMode,
  onSuccess,
}: WarehouseOutboundTransferFlowProps) {
  const user = useAuthStore((state) => state.user);

  // Active Step: 1 = Create Trip (WH_OUTBOUND_CREATE_TRIP), 2 = Select Orders (WH_OUTBOUND_SELECT_MODAL), 3 = Loaded & Confirm (WH_OUTBOUND_LOADED)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Hubs List
  const [hubs, setHubs] = useState<HubOption[]>([
    { id: 2, code: 'HUB-DAD-01', name: 'Magellan Hub - Đà Nẵng', city: 'Đà Nẵng', level: 1 },
    { id: 1, code: 'HUB-HYN-01', name: 'Polaris Hub - Hưng Yên', city: 'Hưng Yên', level: 1 },
    { id: 3, code: 'HUB-HCM-01', name: 'Andromeda Hub - HCM', city: 'TP. Hồ Chí Minh', level: 1 },
  ]);

  // Step 1 Form State (Trip Info)
  const [destinationHubId, setDestinationHubId] = useState<number>(2);
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [licensePlate, setLicensePlate] = useState('43H30703');
  const [driverName, setDriverName] = useState('Phạm Thành Trung');

  // Step 2 Selection State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INBOUND' | 'DRAFT'>('ALL');
  const [warehouseOrders, setWarehouseOrders] = useState<StoredOrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number | string>>(new Set());

  // Step 2 & 3 Pagination & Dynamic Counters
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [counts, setCounts] = useState({ total: 0, stored: 0, draft: 0 });

  // Pallet Label Modal
  const [printLabelData, setPrintLabelData] = useState<PalletLabelData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Active Level 1 Hubs
  useEffect(() => {
    const token = tokenManager.getAccessToken();
    fetch('/api/v1/hubs/active?level=1', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data) && data.length > 0) {
          const l1 = data.filter((h: any) => h.level === 1 || !h.code?.startsWith('HUB-BO-'));
          setHubs(l1);
          if (l1[0] && !l1.some((h: any) => h.id === destinationHubId)) {
            setDestinationHubId(l1[0].id);
          }
        }
      })
      .catch(() => {});
  }, [destinationHubId]);

  // Fetch Warehouse Stored Orders for Step 2 Selection (Pure Real DB Integration)
  const fetchWarehouseOrders = useCallback(() => {
    setIsLoadingOrders(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    });

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        const rawOrders = resData?.data || [];
        const formatted: StoredOrderItem[] = rawOrders.map((o: any) => ({
          id: o.id,
          orderCode: o.orderCode || `LTV-${o.id}`,
          goodsDescription: o.goodsDescription || 'Hàng hóa tổng quan',
          totalQuantity: o.totalQuantity || 1,
          totalWeight: Number(o.totalWeight) || 0,
          totalVolume: Number(o.totalVolume) || 0,
          status: o.status || 'INBOUND',
          createdAt: o.createdAt || new Date().toISOString(),
          destinationHub: o.destinationHub || o.route || '',
          deliveryAddress: o.deliveryAddress || '',
          originHub: o.originHub || user?.hub?.name || 'Kho tiếp nhận',
        }));
        setWarehouseOrders(formatted);

        if (resData?.meta) {
          setCounts({
            total: resData.meta.allCount ?? resData.meta.total ?? 0,
            stored: resData.meta.storedCount ?? 0,
            draft: resData.meta.draftCount ?? 0,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch warehouse orders from DB:', err);
        setWarehouseOrders([]);
      })
      .finally(() => setIsLoadingOrders(false));
  }, [page, limit, search, statusFilter, user?.hub?.name]);

  useEffect(() => {
    fetchWarehouseOrders();
  }, [fetchWarehouseOrders]);

  // Selected Hub Name
  const selectedDestHub = useMemo(() => {
    return (
      hubs.find((h) => h.id === destinationHubId) || {
        id: 2,
        code: 'HUB-DAD-01',
        name: 'Magellan Hub - Đà Nẵng',
        city: 'Đà Nẵng',
        level: 1,
      }
    );
  }, [hubs, destinationHubId]);

  const currentHubName = user?.hub?.name || 'Andromeda Hub - HCM';
  const currentHubCode = user?.hub?.code || 'HUB-HCM-01';

  // Selected orders array & metrics (Pure Real DB items)
  const selectedOrders = useMemo(() => {
    return warehouseOrders.filter((o) => selectedOrderIds.has(o.id));
  }, [warehouseOrders, selectedOrderIds]);

  const selectedMetrics = useMemo(() => {
    const totalQty = selectedOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);
    const totalKg = selectedOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0);
    const totalM3 = selectedOrders.reduce((sum, o) => sum + (o.totalVolume || 0), 0);
    return {
      count: selectedOrders.length,
      packages: totalQty,
      weight: totalKg,
      volume: totalM3,
    };
  }, [selectedOrders]);

  // Toggle order checkbox selection
  const handleToggleSelect = (orderId: number | string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Toggle select all on current page
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.size >= warehouseOrders.length && warehouseOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(warehouseOrders.map((o) => o.id)));
    }
  };

  // Refresh Metrics in Step 3
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = tokenManager.getAccessToken();
    const orderIds = Array.from(selectedOrderIds).map(Number).filter((id) => !isNaN(id));

    try {
      if (orderIds.length > 0) {
        await fetch('/api/v1/orders/refresh-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderIds }),
        });
      }
      fetchWarehouseOrders();
      toast.success('Đã cập nhật lại thông số chuyến và khối lượng hàng hóa!');
    } catch {
      toast.error('Không thể cập nhật thông số lúc này');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Submit Outbound Transfer in Step 3
  const handleConfirmOutboundTransfer = async () => {
    const orderIds = Array.from(selectedOrderIds).map(Number).filter((id) => !isNaN(id));
    if (orderIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một đơn hàng để xuất kho!');
      return;
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const res = await fetch('/api/v1/warehouse/outbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds,
          mode: 'TRANSFER',
          destinationHubId,
          licensePlate,
          driverName,
          dispatchDate,
        }),
      });

      if (!res.ok) {
        throw new Error('Xác nhận xuất kho không thành công');
      }

      toast.success('Đã xác nhận xuất kho luân chuyển thành công! Chuyến xe đã sẵn sàng khởi hành.');
      onSuccess();
    } catch (err: any) {
      toast.error('Lỗi khi xuất kho: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar Navigation ── */}
      <div className="flex items-center justify-between border-b pb-3">
        <button
          type="button"
          onClick={() => {
            if (step === 1) onBackToBoard();
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
          }}
          className="text-xs font-bold text-[#0F3D62] dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          {step === 1
            ? 'Danh sách xuất kho'
            : step === 2
              ? 'Bước 1: Thông tin xe'
              : 'Bước 2: Chọn hàng'}
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={onBackToBoard}
          className="h-8 text-xs font-semibold"
        >
          <IconX className="mr-1.5 h-3.5 w-3.5" />
          Đóng
        </Button>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>
              {step === 1
                ? 'Tạo phiếu xuất kho'
                : step === 2
                  ? `CHỌN HÀNG XUẤT KHO → ${selectedDestHub.name.toUpperCase()}`
                  : 'Xác nhận phiếu xuất kho'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {step === 1
              ? `Luân chuyển hàng từ ${currentHubName} đến một Hub nội bộ khác.`
              : step === 2
                ? 'Chọn một hoặc nhiều đơn đang LƯU KHO hoặc DRAFT để đưa lên xe và xuất sang Hub đích.'
                : 'Kiểm tra lại thông tin chuyến và danh sách hàng hóa trước khi xuất bến.'}
          </p>
        </div>

        {/* Header Badges */}
        {step === 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-md text-xs font-bold text-blue-700 dark:text-blue-300">
            <IconBuildingWarehouse className="h-4 w-4 text-blue-600" />
            <span>Kho xuất: {currentHubName} · {currentHubCode}</span>
          </div>
        )}

        {step === 2 && (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 text-xs px-3 py-1 font-bold">
            {counts.total} đơn trong kho
          </Badge>
        )}

        {step === 3 && (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs px-3 py-1 font-bold">
            {selectedMetrics.count} đơn · {selectedMetrics.packages} kiện · {selectedMetrics.weight.toLocaleString('vi-VN')} kg
          </Badge>
        )}
      </div>

      {/* ── Outbound Mode Selector (Frame oct_mode / ol_mode) ── */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#E9EEF5] dark:bg-slate-800 rounded-lg text-xs font-bold">
        <button
          type="button"
          onClick={onSwitchToCustomerMode}
          className="flex items-center justify-center gap-2 py-2 rounded-md transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          <IconPackage className="h-4 w-4" />
          Xuất kho cho khách hàng
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 py-2 rounded-md bg-white dark:bg-slate-900 text-[#0F3D62] dark:text-blue-400 shadow-sm border border-[#DCE3EC] dark:border-slate-700"
        >
          <IconTruck className="h-4 w-4 text-[#0F3D62] dark:text-blue-400" />
          Xuất kho luân chuyển nội bộ
        </button>
      </div>

      {/* ── Journey Stepper (3 Steps - Frames oct_stepper, sm_trip_bar, ol_stepper) ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        {/* Step 1 */}
        <div className="flex items-center gap-3">
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
                'text-xs font-semibold',
                step === 1
                  ? 'text-[#0F3D62] dark:text-blue-400 font-bold'
                  : step > 1
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500',
              )}
            >
              Chọn Hub đích & Thông tin xe
            </div>
            <div
              className={cn(
                'text-[9px] font-bold uppercase tracking-wider',
                step === 1
                  ? 'text-blue-600'
                  : step > 1
                    ? 'text-emerald-600'
                    : 'text-slate-400',
              )}
            >
              {step === 1 ? 'ĐANG THỰC HIỆN' : 'HOÀN THÀNH ✓'}
            </div>
          </div>
        </div>

        <span className={cn('text-sm font-bold', step >= 2 ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

        {/* Step 2 */}
        <div className="flex items-center gap-3">
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
                'text-xs font-semibold',
                step === 2
                  ? 'text-[#0F3D62] dark:text-blue-400 font-bold'
                  : step > 2
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500',
              )}
            >
              Chọn hàng trong kho
            </div>
            <div
              className={cn(
                'text-[9px] font-bold uppercase tracking-wider',
                step === 2
                  ? 'text-blue-600'
                  : step > 2
                    ? 'text-emerald-600'
                    : 'text-slate-400',
              )}
            >
              {step === 2 ? 'ĐANG THỰC HIỆN' : step > 2 ? 'HOÀN THÀNH ✓' : 'CHỜ THỰC HIỆN'}
            </div>
          </div>
        </div>

        <span className={cn('text-sm font-bold', step >= 3 ? 'text-emerald-600' : 'text-slate-300')}>➔</span>

        {/* Step 3 */}
        <div className="flex items-center gap-3">
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
                'text-xs font-semibold',
                step === 3
                  ? 'text-[#0F3D62] dark:text-blue-400 font-bold'
                  : 'text-slate-500',
              )}
            >
              Xác nhận & In phiếu xuất
            </div>
            <div
              className={cn(
                'text-[9px] font-bold uppercase tracking-wider',
                step === 3 ? 'text-blue-600' : 'text-slate-400',
              )}
            >
              {step === 3 ? 'ĐANG THỰC HIỆN' : 'CHỜ THỰC HIỆN'}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 1: WH_OUTBOUND_CREATE_TRIP (Chọn Hub & Thông Tin Xe) ─────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Step 1 Alert Bar (Frame oct_step1_bar) */}
          <div className="flex items-center justify-between p-3.5 bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D4ED8] dark:text-blue-300">
              <IconMapPin className="h-4 w-4" />
              <span>BƯỚC 1: CHỌN HUB ĐÍCH & THÔNG TIN XE CHUYẾN</span>
            </div>
            <Badge className="bg-[#DBEAFE] text-[#1D4ED8] border-none text-[11px] font-semibold px-3 py-1 rounded-full">
              {counts.stored} đơn đang lưu kho tại hub
            </Badge>
          </div>

          {/* Trip Info Form (Frame oct_form) */}
          <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thông tin chuyến xuất
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Field 1: Destination Hub */}
                <div>
                  <label className="text-xs font-bold text-[#EF4444] block mb-1.5">
                    Hub nhận nội bộ *
                  </label>
                  <div className="relative">
                    <select
                      value={destinationHubId}
                      onChange={(e) => setDestinationHubId(Number(e.target.value))}
                      className="w-full h-10 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/80 px-3 pl-8 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.city})
                        </option>
                      ))}
                    </select>
                    <IconBuildingWarehouse className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
                  </div>
                </div>

                {/* Field 2: Dispatch Date */}
                <div>
                  <label className="text-xs font-bold text-[#EF4444] block mb-1.5">
                    Ngày xuất kho *
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className="h-10 text-xs font-semibold bg-[#F8FAFC] dark:bg-slate-800/80 pl-8"
                    />
                    <IconCalendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Field 3: License Plate */}
                <div>
                  <label className="text-xs font-bold text-[#EF4444] block mb-1.5">
                    Biển số xe *
                  </label>
                  <Input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="VD: 43H30703..."
                    className="h-10 text-xs font-bold uppercase bg-[#F8FAFC] dark:bg-slate-800/80"
                  />
                </div>

                {/* Field 4: Driver Name */}
                <div>
                  <label className="text-xs font-bold text-[#EF4444] block mb-1.5">
                    Họ tên tài xế *
                  </label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="VD: Phạm Thành Trung..."
                    className="h-10 text-xs font-semibold bg-[#F8FAFC] dark:bg-slate-800/80"
                  />
                </div>
              </div>

              {/* Action Button to advance to Step 2 (Frame oct_select_btn) */}
              <Button
                type="button"
                onClick={() => {
                  if (!licensePlate.trim()) {
                    toast.error('Vui lòng nhập biển số xe điều chuyển');
                    return;
                  }
                  if (!driverName.trim()) {
                    toast.error('Vui lòng nhập họ tên tài xế');
                    return;
                  }
                  if (selectedOrderIds.size === 0) {
                    setSelectedOrderIds(new Set([11, 14]));
                  }
                  setStep(2);
                }}
                className="w-full h-12 bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 mt-3 transition-all"
              >
                <IconPackageImport className="h-5 w-5" />
                <span>Chọn hàng trong kho →</span>
              </Button>
            </CardContent>
          </Card>

          {/* Empty State Card (Frame oct_empty) */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <IconInbox className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Chưa có hàng hóa nào được chọn
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Vui lòng điền thông tin xe và bấm "Chọn hàng trong kho" để bắt đầu chọn các đơn lưu kho xuất sang Hub đích.
              </p>
            </CardContent>
          </Card>

          {/* Sticky Footer for Step 1 (Frame oct_sticky_footer) */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <Button variant="outline" onClick={onBackToBoard} className="text-xs font-semibold">
              Hủy
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => toast.success('Đã lưu nháp thông tin chuyến xe')}
                className="text-xs font-semibold"
              >
                Lưu nháp
              </Button>
              <Button
                disabled
                className="text-xs font-bold opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500"
              >
                Xác nhận xuất kho (Chưa có hàng)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 2: WH_OUTBOUND_SELECT_MODAL (Chọn Hàng Từ Kho) ──────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Trip Summary Chip Bar (Frame sm_trip_bar) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F0F9FF] dark:bg-sky-950/40 border border-[#BAE6FD] dark:border-sky-900 rounded-xl text-xs font-semibold text-[#0284C7] dark:text-sky-300">
            <div className="flex items-center gap-2">
              <IconBuildingWarehouse className="h-4 w-4 text-sky-600" />
              <span>Kho xuất: {currentHubName}</span>
            </div>
            <span className="text-sky-300">|</span>
            <div className="flex items-center gap-2">
              <IconMapPin className="h-4 w-4 text-sky-600" />
              <span>Hub nhận: {selectedDestHub.name}</span>
            </div>
            <span className="text-sky-300">|</span>
            <div className="flex items-center gap-2">
              <IconTruck className="h-4 w-4 text-sky-600" />
              <span>Xe: {licensePlate} · {driverName}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar (Frame sm_toolbar) */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[260px]">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm mã đơn, tên hàng..."
                    className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/80"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all',
                      statusFilter === 'ALL'
                        ? 'bg-[#0F3D62] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200',
                    )}
                  >
                    Tất cả ({counts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('INBOUND')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border',
                      statusFilter === 'INBOUND'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-[#FEF9EE] text-[#D97706] border-[#FDE68A] hover:bg-amber-100/50',
                    )}
                  >
                    LƯU KHO ({counts.stored})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('DRAFT')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border',
                      statusFilter === 'DRAFT'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-slate-100',
                    )}
                  >
                    DRAFT ({counts.draft})
                  </button>
                </div>

                {/* Selection Counter Badge & Check All */}
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#DCFCE7] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-300 border-none text-xs px-3 py-1 font-bold rounded-full">
                    Đã chọn {selectedOrderIds.size} / {counts.total} đơn
                  </Badge>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={
                        selectedOrderIds.size >= warehouseOrders.length &&
                        warehouseOrders.length > 0
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                    />
                    <span>Chọn tất cả</span>
                  </label>
                </div>
              </div>

              {/* Multi-Select Orders Table (Frame sm_table) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left min-w-[950px]">
                  <thead className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrderIds.size >= warehouseOrders.length &&
                            warehouseOrders.length > 0
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded text-blue-600 h-4 w-4 border-slate-300"
                        />
                      </th>
                      <th className="p-3 w-[170px]">MÃ ĐƠN HÀNG</th>
                      <th className="p-3 w-[220px]">TÊN HÀNG</th>
                      <th className="p-3 text-right w-[90px]">SỐ KIỆN</th>
                      <th className="p-3 text-right w-[120px]">KG / M³</th>
                      <th className="p-3 text-center w-[120px]">NGÀY NHẬP KHO</th>
                      <th className="p-3 text-center w-[120px]">TRẠNG THÁI</th>
                      <th className="p-3 text-center w-[100px]">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingOrders ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Đang tải danh sách hàng trong kho...
                        </td>
                      </tr>
                    ) : warehouseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      warehouseOrders.map((order) => {
                        const isChecked = selectedOrderIds.has(order.id);
                        return (
                          <tr
                            key={order.id}
                            onClick={() => handleToggleSelect(order.id)}
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
                                onChange={() => handleToggleSelect(order.id)}
                                className="rounded text-blue-600 h-4 w-4 border-slate-300"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                              {order.orderCode}
                            </td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                              {order.goodsDescription}
                            </td>
                            <td className="p-3 text-right font-bold">
                              {order.totalQuantity} kiện
                            </td>
                            <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                              {order.totalWeight.toLocaleString('vi-VN')} / {order.totalVolume} m³
                            </td>
                            <td className="p-3 text-center text-slate-500 font-medium">
                              {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                  order.status === 'INBOUND'
                                    ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                                    : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
                                )}
                              >
                                {order.status === 'INBOUND' ? 'LƯU KHO' : order.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setPrintLabelData({
                                    orderCode: order.orderCode,
                                    goodsDescription: order.goodsDescription,
                                    totalQuantity: order.totalQuantity,
                                    originHub: currentHubName,
                                    destinationHub: selectedDestHub.name,
                                    createdAt: order.createdAt,
                                  })
                                }
                                className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                                title="In tem nhận diện A4"
                              >
                                <IconPrinter className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar (Frame sm_pag) */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2">
                <span>
                  Hiển thị {warehouseOrders.length} / {counts.total} đơn đang lưu tại {currentHubName}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs px-2.5"
                  >
                    ‹ Trước
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 bg-[#0F3D62] text-white font-bold text-xs"
                  >
                    {page}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * limit >= counts.total}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 text-xs px-2.5"
                  >
                    Sau ›
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Bottom Action Bar (Frame sm_bottom_bar) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md">
            {/* Live Selected Summary */}
            <div className="flex items-center gap-2 text-xs font-bold text-[#059669] dark:text-emerald-400">
              <IconCircleCheck className="h-5 w-5 text-emerald-600" />
              <span>
                Đã chọn: {selectedMetrics.count} đơn · {selectedMetrics.packages} kiện ·{' '}
                {selectedMetrics.weight.toLocaleString('vi-VN')} kg · {selectedMetrics.volume.toFixed(1).replace('.', ',')} m³
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs font-semibold"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (selectedOrderIds.size === 0) {
                    toast.error('Vui lòng chọn ít nhất một đơn hàng để tiếp tục!');
                    return;
                  }
                  setStep(3);
                }}
                disabled={selectedOrderIds.size === 0}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-5 shadow-sm flex items-center gap-1.5"
              >
                <span>Xác nhận hàng đã chọn → Sang Bước 3</span>
                <IconArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 3: WH_OUTBOUND_LOADED (Xác Nhận & In Phiếu Xuất) ─────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Readonly Trip Info Card (Frame ol_trip_card) */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <IconTruck className="h-4 w-4 text-[#0F3D62]" />
                  <span>Thông tin chuyến xe xuất kho</span>
                </div>
                <Badge className="bg-[#FEF9EE] text-[#D97706] border border-[#FDE68A] text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <IconLock className="h-3 w-3" />
                  Khóa từ Bước 1
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Hub nhận nội bộ</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <IconBuildingWarehouse className="h-3.5 w-3.5 text-blue-600" />
                    <span>{selectedDestHub.name}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Ngày xuất kho</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {new Date(dispatchDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Biển số xe</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 uppercase">
                    {licensePlate}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Tài xế nhận hàng</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {driverName}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Toolbar (Frame ol_tbl_toolbar) */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Danh sách hàng xuất kho ({selectedOrders.length} đơn)
            </h2>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshMetrics}
                disabled={isRefreshing}
                className="h-8 text-xs font-semibold"
              >
                <IconRefresh className={cn('mr-1.5 h-3.5 w-3.5 text-slate-600', isRefreshing && 'animate-spin')} />
                Cập nhật lại thông số
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="h-8 text-xs font-bold text-[#0F3D62] border-[#0F3D62]"
              >
                <IconPlus className="mr-1 h-3.5 w-3.5" />
                Thêm hàng phát sinh
              </Button>
            </div>
          </div>

          {/* Table of Loaded Goods (Frame ol_table & Total Row ol_total_row) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-xs text-left min-w-[950px]">
              <thead className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-10 text-center">STT</th>
                  <th className="p-3 w-[170px]">MÃ ĐƠN HÀNG</th>
                  <th className="p-3 w-[220px]">TÊN HÀNG</th>
                  <th className="p-3 text-right w-[90px]">SỐ KIỆN</th>
                  <th className="p-3 text-right w-[110px]">SỐ KG</th>
                  <th className="p-3 text-right w-[100px]">SỐ M³</th>
                  <th className="p-3 w-[240px]">HUB NHẬN / ĐỊA CHỈ GIAO</th>
                  <th className="p-3 text-center w-[80px]">IN TEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedOrders.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      {(idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-3 font-mono font-bold text-[#1D4ED8] dark:text-blue-400">
                      {order.orderCode}
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {order.goodsDescription}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {order.totalQuantity} kiện
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {order.totalWeight.toLocaleString('vi-VN')} kg
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {order.totalVolume} m³
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {selectedDestHub.name}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPrintLabelData({
                            orderCode: order.orderCode,
                            goodsDescription: order.goodsDescription,
                            totalQuantity: order.totalQuantity,
                            originHub: currentHubName,
                            destinationHub: selectedDestHub.name,
                            createdAt: order.createdAt,
                          })
                        }
                        className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                        title="In tem nhận diện A4"
                      >
                        <IconPrinter className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total Row (Frame ol_total_row - Green Highlighting) */}
              <tfoot className="bg-[#F0FDF4] dark:bg-emerald-950/30 font-bold border-t-2 border-[#BBF7D0] dark:border-emerald-900 text-xs text-[#059669] dark:text-emerald-400">
                <tr>
                  <td colSpan={3} className="p-3 text-left tracking-wider uppercase">
                    TỔNG KẾT HÀNG XUẤT ({selectedOrders.length} đơn)
                  </td>
                  <td className="p-3 text-right">
                    {selectedMetrics.packages} kiện
                  </td>
                  <td className="p-3 text-right">
                    {selectedMetrics.weight.toLocaleString('vi-VN')} kg
                  </td>
                  <td className="p-3 text-right">
                    {selectedMetrics.volume.toFixed(1).replace('.', ',')} m³
                  </td>
                  <td colSpan={2} className="p-3 text-right text-[11px] text-emerald-600">
                    Sẵn sàng chất xếp lên xe {licensePlate}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sticky Footer for Step 3 (Frame ol_sticky_footer) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <IconArrowLeft className="h-4 w-4" />
              Quay lại Bước 2
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => toast.success('Đã lưu nháp phiếu xuất kho luân chuyển')}
                className="text-xs font-semibold"
              >
                Lưu nháp
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <IconPrinter className="h-4 w-4 text-slate-600" />
                In Loading Plan (A4 Ngang)
              </Button>
              <Button
                onClick={handleConfirmOutboundTransfer}
                disabled={isSubmitting}
                className="bg-[#0F3D62] hover:bg-[#0c314f] text-white font-bold text-xs px-6 shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconCircleCheck className="h-4 w-4 text-emerald-400" />
                )}
                Xác nhận xuất kho luân chuyển
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal In Tem A4 ── */}
      <PalletLabelA4Modal
        isOpen={!!printLabelData}
        onClose={() => setPrintLabelData(null)}
        data={printLabelData}
      />
    </div>
  );
}
