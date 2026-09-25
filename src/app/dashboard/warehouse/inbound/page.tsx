'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconPlus,
  IconLoader2,
  IconCalendar,
  IconUser,
  IconSearch,
  IconRefresh,
  IconPrinter,
  IconCircleCheck,
  IconClipboardCheck,
  IconEye,
  IconX,
  IconChevronDown,
  IconChevronRight,
  IconFoldUp,
  IconFoldDown,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { WarehouseInboundTransferFlow } from '@/features/warehouse/components/warehouse-inbound-transfer-flow';
import { PalletLabelA4Modal, PalletLabelData } from '@/features/warehouse/components/pallet-label-a4-modal';
import { WarehouseInboundReceiptModal, InboundReceiptData, InboundReceiptItem } from '@/features/warehouse/components/warehouse-inbound-receipt-modal';
import { WarehouseWaybillDetailModal, WaybillDetailData } from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { WarehouseTallyModal } from '@/features/warehouse/components/warehouse-tally-modal';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';

export default function WarehouseInboundPage() {
  const user = useAuthStore((state) => state.user);

  // Active View State: 'BOARD' (sq2P6) | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>('BOARD');

  // Inbound Board State (sq2P6)
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'WAITING' | 'CUSTOMER' | 'TRANSFER' | 'STORED'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [orders, setOrders] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWaybillForDetail, setSelectedWaybillForDetail] = useState<WaybillDetailData | null>(null);

  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedWaybillForTally, setSelectedWaybillForTally] = useState<WaybillDetailData | null>(null);

  // Pallet Label A4 Modal State
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedLabelData, setSelectedLabelData] = useState<PalletLabelData | null>(null);

  // Inbound Receipt A4 Modal State
  const [isInboundReceiptModalOpen, setIsInboundReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<InboundReceiptData | null>(null);

  // Vehicle Header Fields (3 Red-Border Required Fields for Mode 1 - Frame UVtv4)
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [licensePlate, setLicensePlate] = useState('');
  const [driverName, setDriverName] = useState('');

  // Mode 1 Rows (Pure Clean Initial State for Warehouse Intake)
  const [mode1Rows, setMode1Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '',
      pickupAddress: '',
      goodsDescription: '',
      totalQuantity: 1,
      totalWeight: 0,
      totalVolume: 0,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '',
      province: '',
      notes: '',
    },
  ]);

  // Tự động gán kho của nhân viên cho dòng khởi tạo nếu chưa có
  useEffect(() => {
    if (user?.hub?.name) {
      const hubName: string = user.hub.name || '';
      setMode1Rows((prev) => {
        if (prev.length === 1 && !prev[0].pickupAddress) {
          return [{ ...prev[0], pickupAddress: hubName }];
        }
        return prev;
      });
    }
  }, [user?.hub?.name]);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // KPI Stats
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    waitingInbound: 0,
    customerInbound: 0,
    transferInbound: 0,
    storedInbound: 0,
    waitingOutbound: 0,
    completedOutboundToday: 0,
  });

  // Fetch KPI
  const fetchKpi = useCallback(() => {
    const token = tokenManager.getAccessToken();
    fetch('/api/v1/warehouse/kpi', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        const payload = resData?.data || resData;
        if (payload) setKpiStats((prev) => ({ ...prev, ...payload }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  // Fetch Inbound Board Orders with Pagination
  const fetchInboundOrders = useCallback(() => {
    setIsLoadingOrders(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusTab !== 'ALL' ? { status: statusTab } : {}),
    });

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        setOrders(resData?.data || []);
        setMeta({
          total: resData?.meta?.total ?? resData?.data?.length ?? 0,
          totalPages: resData?.meta?.totalPages ?? 1,
        });
      })
      .catch(() => {
        setOrders([]);
        setMeta({ total: 0, totalPages: 1 });
      })
      .finally(() => setIsLoadingOrders(false));
  }, [page, pageSize, search, statusTab]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchInboundOrders();
    }
  }, [activeView, fetchInboundOrders]);

  // Vehicle Group Interface (Feedback 17/8 & Prompt: 1 dòng là 1 xe)
  interface InboundVehicleGroup {
    groupKey: string;
    licensePlate: string;
    driverName: string;
    tripCode: string;
    receiveDate?: string;
    status: string;
    isTransfer: boolean;
    orders: any[];
    totalQuantity: number;
    totalWeight: number;
    totalVolume: number;
    goodsDescription: string;
    notes?: string;
  }

  // Collapsed / Expanded Vehicle Groups State
  const [expandedVehicleKeys, setExpandedVehicleKeys] = useState<Record<string, boolean>>({});

  const toggleExpandVehicle = (key: string) => {
    setExpandedVehicleKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Group inbound orders by vehicle / trip
  const vehicleGroups: InboundVehicleGroup[] = useMemo(() => {
    const map = new Map<string, InboundVehicleGroup>();

    for (const o of orders) {
      const activeTrip = o.trips?.[0];
      let plate =
        activeTrip?.licensePlate?.trim()?.toUpperCase() ||
        o.vehicleLicensePlate?.trim()?.toUpperCase() ||
        '';
      let driver = activeTrip?.driverName?.trim() || o.driverName?.trim() || '';
      let tripCode =
        activeTrip?.tripCode?.trim() ||
        (activeTrip?.id ? `TRIP-${activeTrip.id}` : '');

      if (!plate && o.notes) {
        const m = o.notes.match(/\[Xe:\s*([^-\]]+)/i);
        if (m) plate = m[1].trim().toUpperCase();
      }
      if (!driver && o.notes) {
        const m = o.notes.match(/TX:\s*([^-\]]+)/i);
        if (m) driver = m[1].trim();
      }

      // Grouping key: prefer tripCode, then plate, then order id fallback
      const key = tripCode || (plate ? `PLATE-${plate}` : `ORD-${o.id}`);

      const isTransfer =
        o.inboundType === 'TRANSFER' ||
        o.orderCode?.startsWith('TRIP') ||
        (o.originHub && o.destinationHub && o.originHub !== o.destinationHub) ||
        (o.originHubEntity?.id &&
          o.destinationHubEntity?.id &&
          o.originHubEntity.id !== o.destinationHubEntity.id);

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          licensePlate: plate || 'CHƯA GÁN XE',
          driverName: driver,
          tripCode: tripCode || '—',
          receiveDate: activeTrip?.pickupDate || o.createdAt?.split('T')[0],
          status: o.status,
          isTransfer,
          orders: [],
          totalQuantity: 0,
          totalWeight: 0,
          totalVolume: 0,
          goodsDescription: '',
          notes: o.notes || '',
        });
      }

      const grp = map.get(key)!;
      grp.orders.push(o);
      grp.totalQuantity += Number(o.inboundQuantity ?? o.totalQuantity ?? 1);
      grp.totalWeight += Number(o.totalWeight ?? 0);
      grp.totalVolume += Number(o.totalVolume ?? 0);

      // If any order is waiting/draft, show waiting status
      if (['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING'].includes(o.status)) {
        grp.status = o.status;
      }
    }

    map.forEach((grp) => {
      const descs = Array.from(
        new Set(grp.orders.map((x) => x.goodsDescription).filter(Boolean)),
      );
      if (descs.length === 1) {
        grp.goodsDescription = descs[0];
      } else if (descs.length > 1) {
        grp.goodsDescription = `${descs[0]} (+${descs.length - 1} loại hàng)`;
      } else {
        grp.goodsDescription = 'Hàng hóa tổng quan';
      }
    });

    return Array.from(map.values());
  }, [orders]);

  const allExpanded = useMemo(() => {
    if (vehicleGroups.length === 0) return false;
    return vehicleGroups.every((g) => !!expandedVehicleKeys[g.groupKey]);
  }, [vehicleGroups, expandedVehicleKeys]);

  const toggleAllGroups = () => {
    if (allExpanded) {
      setExpandedVehicleKeys({});
    } else {
      const next: Record<string, boolean> = {};
      vehicleGroups.forEach((g) => {
        next[g.groupKey] = true;
      });
      setExpandedVehicleKeys(next);
    }
  };

  const handleOpenReceiptForVehicle = (grp: InboundVehicleGroup) => {
    const orig =
      grp.orders[0]?.pickupAddress?.trim() ||
      grp.orders[0]?.originHubEntity?.name ||
      grp.orders[0]?.originHub ||
      user?.hub?.name;
    const dest =
      grp.orders[0]?.destinationHubEntity?.name ||
      grp.orders[0]?.destinationHub ||
      grp.orders[0]?.deliveryAddress?.trim() ||
      '';

    const items: InboundReceiptItem[] = grp.orders.map((o) => ({
      orderCode: o.orderCode,
      goodsDescription: o.goodsDescription || 'Hàng hóa nhập kho',
      quantity: o.inboundQuantity ?? o.totalQuantity ?? 1,
      unit: 'Kiện',
      deliveryAddress: o.deliveryAddress || o.destinationHub || '—',
      notes: o.notes || '',
    }));

    setSelectedReceiptData({
      tripCode: grp.tripCode !== '—' ? grp.tripCode : undefined,
      orderCode: grp.orders[0]?.orderCode || grp.tripCode,
      goodsDescription: grp.goodsDescription,
      totalQuantity: grp.totalQuantity,
      inboundQuantity: grp.totalQuantity,
      totalWeight: grp.totalWeight,
      totalVolume: grp.totalVolume,
      originHub: orig,
      destinationHub: dest,
      pickupAddress: grp.orders[0]?.pickupAddress,
      deliveryAddress: grp.orders[0]?.deliveryAddress,
      notes: grp.notes,
      driverName: grp.driverName,
      licensePlate: grp.licensePlate,
      createdAt: grp.orders[0]?.createdAt || new Date(),
      items,
    });
    setIsInboundReceiptModalOpen(true);
  };

  // Refresh Metrics Button Action
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = tokenManager.getAccessToken();

    try {
      const orderIds = orders.map((o) => Number(o.id)).filter((id) => !isNaN(id) && id > 0);
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
      fetchKpi();
      fetchInboundOrders();
      toast.success('Đã cập nhật lại thông số tiếp nhận kho thành công!');
    } catch {
      toast.info('Đã làm mới thông số tiếp nhận kho.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Submit Batch Inbound Confirmation
  const handleBatchConfirmInbound = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn hàng để nhập kho');
      return;
    }

    setIsBatchSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const res = await fetch('/api/v1/warehouse/inbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xác nhận nhập kho thành công cho ${selectedOrderIds.length} đơn hàng!`);
      setSelectedOrderIds([]);
      fetchKpi();
      fetchInboundOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận nhập kho hàng loạt');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Submit Mode 1 (Direct Customer Inbound)
  const handleSubmitMode1 = async () => {
    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập Biển số xe tiếp nhận');
      return;
    }

    // Client-side row validations
    for (let i = 0; i < mode1Rows.length; i++) {
      const row = mode1Rows[i];
      const rowNum = i + 1;
      if (!row.goodsDescription || !row.goodsDescription.trim()) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Tên loại hàng`);
        return;
      }
      if (!row.totalQuantity || Number(row.totalQuantity) < 1) {
        toast.error(`Dòng ${rowNum}: Số kiện phải lớn hơn hoặc bằng 1`);
        return;
      }
      if (row.totalWeight === undefined || row.totalWeight === null || Number(row.totalWeight) < 0) {
        toast.error(`Dòng ${rowNum}: Số kg phải lớn hơn hoặc bằng 0`);
        return;
      }
      if (row.totalVolume === undefined || row.totalVolume === null || Number(row.totalVolume) < 0) {
        toast.error(`Dòng ${rowNum}: Số khối m³ phải lớn hơn hoặc bằng 0`);
        return;
      }
      if (row.deliveryMode === 'DIRECT_CUSTOMER' && (!row.deliveryAddress || !row.deliveryAddress.trim())) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Địa chỉ giao hàng`);
        return;
      }
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const itemsPayload = mode1Rows.map((row) => {
        const rawCode = row.orderCode?.trim();
        const finalCode =
          rawCode && rawCode !== '(Tự sinh khi lưu)' && !rawCode.startsWith('(Tự sinh')
            ? rawCode.toUpperCase()
            : undefined;

        return {
          orderCode: finalCode,
          goodsDescription: row.goodsDescription.trim(),
          totalQuantity: Number(row.totalQuantity) || 1,
          totalWeight: Number(row.totalWeight) || 0,
          totalVolume: Number(row.totalVolume) || 0,
          pickupAddress: row.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: row.deliveryAddress?.trim() || '',
          province: row.province?.trim() || undefined,
          deliveryMode: row.deliveryMode || 'DIRECT_CUSTOMER',
          destinationHubId: row.destinationHubId || null,
          notes: row.notes?.trim() || undefined,
          initialStatus: 'INBOUND',
        };
      });

      const res = await fetch('/api/v1/warehouse/inbound/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          licensePlate: licensePlate.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          receiveDate: receiveDate || undefined,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      const resJson = await res.json().catch(() => null);
      const batchResult = resJson?.data || resJson;

      toast.success(
        `Đã tiếp nhận thành công xe ${licensePlate.trim().toUpperCase()} (${mode1Rows.length} dòng hàng) - Mã chuyến: ${batchResult?.tripCode || 'TRIP'}!`,
      );

      setMode1Rows([
        {
          orderCode: '',
          pickupAddress: user?.hub?.name || '',
          goodsDescription: '',
          totalQuantity: 1,
          totalWeight: 0,
          totalVolume: 0,
          deliveryMode: 'DIRECT_CUSTOMER',
          deliveryAddress: '',
          province: '',
          notes: '',
        },
      ]);
      setLicensePlate('');
      setDriverName('');
      setActiveView('BOARD');
      fetchKpi();
      fetchInboundOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi tiếp nhận hàng vào kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Mode 1 as Draft (Lưu nháp đơn hàng nhập kho)
  const handleSaveDraftMode1 = async () => {
    if (mode1Rows.length === 0) {
      toast.error('Vui lòng có ít nhất 1 dòng hàng để lưu nháp');
      return;
    }
    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập Biển số xe để lưu nháp');
      return;
    }

    setIsSavingDraft(true);
    const token = tokenManager.getAccessToken();

    try {
      const itemsPayload = mode1Rows.map((row) => {
        const rawCode = row.orderCode?.trim();
        const finalCode =
          rawCode && rawCode !== '(Tự sinh khi lưu)' && !rawCode.startsWith('(Tự sinh')
            ? rawCode.toUpperCase()
            : undefined;

        return {
          orderCode: finalCode,
          goodsDescription: row.goodsDescription?.trim() || 'Hàng lưu kho (Nháp)',
          totalQuantity: Number(row.totalQuantity) > 0 ? Number(row.totalQuantity) : 1,
          totalWeight: Number(row.totalWeight) >= 0 ? Number(row.totalWeight) : 0,
          totalVolume: Number(row.totalVolume) >= 0 ? Number(row.totalVolume) : 0,
          pickupAddress: row.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: row.deliveryAddress?.trim() || '',
          province: row.province?.trim() || undefined,
          deliveryMode: row.deliveryMode || 'DIRECT_CUSTOMER',
          destinationHubId: row.destinationHubId || null,
          notes: row.notes?.trim() || undefined,
          initialStatus: 'DRAFT',
        };
      });

      const res = await fetch('/api/v1/warehouse/inbound/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          licensePlate: licensePlate.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          receiveDate: receiveDate || undefined,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã lưu nháp thành công ${mode1Rows.length} đơn hàng nhập kho!`);
      setMode1Rows([
        {
          orderCode: '',
          pickupAddress: user?.hub?.name || '',
          goodsDescription: '',
          totalQuantity: 1,
          totalWeight: 0,
          totalVolume: 0,
          deliveryMode: 'DIRECT_CUSTOMER',
          deliveryAddress: '',
          province: '',
          notes: '',
        },
      ]);
      setLicensePlate('');
      setDriverName('');
      setActiveView('BOARD');
      setStatusTab('WAITING');
      fetchKpi();
      fetchInboundOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi lưu nháp đơn hàng');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className="space-y-4 flex-1 w-full min-w-0">
        {/* ── Page Header (Frame sq2P6 parity) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400">
              <IconBuildingWarehouse className="h-6 w-6" />
              <span>Nhập kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý luồng hàng nhập kho (Khách gửi trực tiếp hoặc Luân chuyển liên Hub).
            </p>
          </div>

          {activeView === 'BOARD' ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActiveView('MODE1_CUSTOMER')}
                className="bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm"
              >
                <IconPlus className="mr-1 h-4 w-4" /> Tạo đơn nhập mới
              </Button>
              <Button
                onClick={() => setActiveView('MODE2_TRANSFER')}
                className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold shadow-sm"
              >
                <IconTruck className="mr-1 h-4 w-4" /> Nhận luân chuyển nội bộ
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView('BOARD')}
              className="text-xs font-semibold"
            >
              <IconX className="mr-1.5 h-4 w-4" /> Quay lại danh sách
            </Button>
          )}
        </div>

        {/* ── View 1: Main Inbound Board (Frame sq2P6 Danh sách nhập kho) ── */}
        {activeView === 'BOARD' && (
          <div className="space-y-4">

            {/* Toolbar: Search, Status Tabs & Refresh Button */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Status Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
                    {[
                      { key: 'ALL', label: `Tất cả (${kpiStats.total ?? meta.total})` },
                      { key: 'WAITING', label: `Chờ nhập kho (${kpiStats.waitingInbound ?? 0})` },
                      { key: 'CUSTOMER', label: `Khách gửi (${kpiStats.customerInbound ?? 0})` },
                      { key: 'TRANSFER', label: `Luân chuyển (${kpiStats.transferInbound ?? 0})` },
                      { key: 'STORED', label: `Đã nhập kho (${kpiStats.storedInbound ?? 0})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setStatusTab(tab.key as any);
                          setSelectedOrderIds([]);
                          setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                          statusTab === tab.key
                            ? 'bg-white text-[#0F3D62] shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                            : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                    {/* Search Input */}
                    <div className="relative min-w-[240px] max-w-xs">
                      <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Tìm mã vận đơn, khách hàng, nguồn/trip..."
                        className="pl-8 h-9 text-xs"
                      />
                    </div>

                    {/* Expand / Collapse All Vehicles */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllGroups}
                      className="h-9 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50"
                      title={allExpanded ? 'Thu gọn tất cả xe' : 'Mở rộng tất cả xe'}
                    >
                      {allExpanded ? (
                        <>
                          <IconFoldUp className="mr-1.5 h-4 w-4 text-slate-600" />
                          <span>Thu gọn tất cả</span>
                        </>
                      ) : (
                        <>
                          <IconFoldDown className="mr-1.5 h-4 w-4 text-slate-600" />
                          <span>Mở rộng tất cả</span>
                        </>
                      )}
                    </Button>

                    {/* Refresh Metrics Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshMetrics}
                      disabled={isRefreshing}
                      className="h-9 text-xs font-bold border-slate-300"
                    >
                      <IconRefresh className={`mr-1.5 h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Cập nhật lại thông số</span>
                    </Button>
                  </div>
                </div>

                {/* Floating Batch Action Bar if rows selected */}
                {selectedOrderIds.length > 0 && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900 text-xs animate-in fade-in duration-200">
                    <span className="font-bold text-blue-900 dark:text-blue-200">
                      Đã chọn {selectedOrderIds.length} đơn hàng
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrderIds([])}
                        className="h-7 text-xs text-slate-600"
                      >
                        Bỏ chọn
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBatchConfirmInbound}
                        disabled={isBatchSubmitting}
                        className="h-7 text-xs font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f]"
                      >
                        {isBatchSubmitting ? (
                          <>
                            <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Đang nhập kho...
                          </>
                        ) : (
                          <>
                            <IconCircleCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Xác nhận nhập kho {selectedOrderIds.length} đơn
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inbound Board Table (Frame sq2P6) */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="p-2.5 w-[40px] text-center">
                          <input
                            type="checkbox"
                            checked={
                              orders.length > 0 &&
                              orders.every((o) => selectedOrderIds.includes(Number(o.id)))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(orders.map((o) => Number(o.id)));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5 w-[160px]">CHUYẾN XE / TRIP</th>
                        <th className="p-2.5 w-[160px]">XE & TÀI XẾ</th>
                        <th className="p-2.5 min-w-[150px]">HÀNG HÓA TỔNG HỢP</th>
                        <th className="p-2.5 text-right w-[140px]">SỐ KIỆN / TẢI TRỌNG</th>
                        <th className="p-2.5 w-[110px] text-center">TRẠNG THÁI</th>
                        <th className="p-2.5 text-center w-[110px]">LOẠI TIẾP NHẬN</th>
                        <th className="p-2.5 text-center w-[190px]">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {isLoadingOrders ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
                            <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                            Đang tải danh sách đơn nhập kho...
                          </td>
                        </tr>
                      ) : vehicleGroups.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-400">
                            Không có chuyến xe nhập kho phù hợp bộ lọc
                          </td>
                        </tr>
                      ) : (
                        vehicleGroups.map((grp) => {
                          const isExpanded = !!expandedVehicleKeys[grp.groupKey];
                          const groupOrderIds = grp.orders.map((o) => Number(o.id));
                          const isGroupSelected =
                            groupOrderIds.length > 0 &&
                            groupOrderIds.every((id) => selectedOrderIds.includes(id));
                          const hasWaiting = grp.orders.some((o) =>
                            ['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING'].includes(o.status),
                          );

                          return (
                            <React.Fragment key={grp.groupKey}>
                              <tr className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isGroupSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedOrderIds((prev) =>
                                          Array.from(new Set([...prev, ...groupOrderIds])),
                                        );
                                      } else {
                                        setSelectedOrderIds((prev) =>
                                          prev.filter((id) => !groupOrderIds.includes(id)),
                                        );
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandVehicle(grp.groupKey)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                                      title={isExpanded ? 'Thu gọn danh sách đơn' : 'Xem chi tiết các đơn trên xe'}
                                    >
                                      {isExpanded ? (
                                        <IconChevronDown className="h-4 w-4 text-blue-600 font-bold" />
                                      ) : (
                                        <IconChevronRight className="h-4 w-4 text-slate-400" />
                                      )}
                                    </button>
                                    <div>
                                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                        {grp.tripCode}
                                      </span>
                                      {grp.orders.length > 1 && (
                                        <Badge
                                          variant="outline"
                                          className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 font-bold"
                                        >
                                          {grp.orders.length} đơn
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="text-xs space-y-0.5">
                                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                                      <IconTruck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      <span>{grp.licensePlate}</span>
                                    </div>
                                    {grp.driverName && (
                                      <div
                                        className="text-[11px] text-gray-500 truncate max-w-[140px]"
                                        title={grp.driverName}
                                      >
                                        {grp.driverName}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div
                                    className="text-slate-900 dark:text-white font-medium text-xs truncate max-w-[160px]"
                                    title={grp.goodsDescription}
                                  >
                                    {grp.goodsDescription}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                  <div>{grp.totalQuantity} kiện</div>
                                  <div className="text-gray-400 text-[10px]">
                                    {grp.totalWeight.toLocaleString('vi-VN')} kg &bull; {grp.totalVolume} m³
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  {renderWarehouseOrderStatusBadge(grp.status)}
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <Badge
                                    variant="outline"
                                    className={
                                      grp.isTransfer
                                        ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold text-[10px]'
                                        : 'bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px]'
                                    }
                                  >
                                    {grp.isTransfer ? 'Luân chuyển' : 'Khách gửi'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {hasWaiting ? (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          const firstWaiting = grp.orders.find((o) =>
                                            ['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING'].includes(o.status),
                                          );
                                          if (firstWaiting) {
                                            setSelectedWaybillForTally(firstWaiting);
                                            setIsTallyModalOpen(true);
                                          }
                                        }}
                                        className="h-7 text-[11px] font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f] px-2 shadow-xs"
                                        title="Kiểm đếm nhận hàng"
                                      >
                                        <IconClipboardCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Kiểm đếm
                                      </Button>
                                    ) : null}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenReceiptForVehicle(grp)}
                                      className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 px-2 font-semibold"
                                      title="In phiếu nhập xe (chứa tất cả đơn hàng của xe)"
                                    >
                                      <IconPrinter className="h-3.5 w-3.5 mr-1" /> In phiếu nhập
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpandVehicle(grp.groupKey)}
                                      className="h-7 text-[11px] text-slate-600 hover:text-blue-700 px-1.5"
                                      title={isExpanded ? 'Thu gọn danh sách đơn' : 'Xem các đơn'}
                                    >
                                      {isExpanded ? 'Thu gọn' : 'Xem đơn'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* Nested Sub-row with all orders of this vehicle */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                                  <td colSpan={8} className="p-3 pl-10 pr-4">
                                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-xs space-y-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                          <IconTruck className="h-3.5 w-3.5 text-blue-600" />
                                          <span>Chi tiết các đơn hàng thuộc xe {grp.licensePlate} ({grp.tripCode})</span>
                                        </span>
                                        <span>Tổng cộng: {grp.orders.length} đơn &bull; {grp.totalQuantity} kiện</span>
                                      </div>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-slate-400 text-[11px] border-b border-slate-100 dark:border-slate-700 text-left">
                                            <th className="py-1 px-2 font-medium w-[140px]">MÃ VẬN ĐƠN</th>
                                            <th className="py-1 px-2 font-medium min-w-[160px]">HÀNG HÓA</th>
                                            <th className="py-1 px-2 font-medium text-right w-[140px]">SỐ KIỆN / TẢI TRỌNG</th>
                                            <th className="py-1 px-2 font-medium text-center w-[110px]">TRẠNG THÁI</th>
                                            <th className="py-1 px-2 font-medium min-w-[140px]">GHI CHÚ</th>
                                            <th className="py-1 px-2 font-medium text-center w-[160px]">THAO TÁC</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                          {grp.orders.map((subOrder) => {
                                            const subWaiting = ['DRAFT', 'PENDING', 'PENDING_INBOUND', 'WAITING'].includes(subOrder.status);

                                            return (
                                              <tr key={subOrder.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="py-1.5 px-2">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedWaybillForDetail(subOrder);
                                                      setIsDetailModalOpen(true);
                                                    }}
                                                    className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left block text-xs"
                                                    title="Xem chi tiết mã vận đơn"
                                                  >
                                                    {subOrder.orderCode}
                                                  </button>
                                                </td>
                                                <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                                  {subOrder.goodsDescription || 'Hàng hóa nhập kho'}
                                                </td>
                                                <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                                  <div>{subOrder.inboundQuantity ?? subOrder.totalQuantity ?? 1} kiện</div>
                                                  <div className="text-gray-400 text-[10px]">
                                                    {subOrder.totalWeight?.toLocaleString('vi-VN')} kg &bull; {subOrder.totalVolume} m³
                                                  </div>
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                  {renderWarehouseOrderStatusBadge(subOrder.status)}
                                                </td>
                                                <td className="py-1.5 px-2 text-slate-500 text-[11px] truncate max-w-[180px]" title={subOrder.notes}>
                                                  {subOrder.notes || '—'}
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                  <div className="flex items-center justify-center gap-1">
                                                    {subWaiting ? (
                                                      <Button
                                                        size="sm"
                                                        onClick={() => {
                                                          setSelectedWaybillForTally(subOrder);
                                                          setIsTallyModalOpen(true);
                                                        }}
                                                        className="h-6 text-[10px] font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f] px-2 shadow-xs"
                                                      >
                                                        <IconClipboardCheck className="h-3 w-3 mr-1 text-emerald-400" /> Kiểm đếm
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                          setSelectedWaybillForDetail(subOrder);
                                                          setIsDetailModalOpen(true);
                                                        }}
                                                        className="h-6 text-[10px] px-1.5 text-slate-600 hover:text-blue-700 font-semibold"
                                                      >
                                                        <IconEye className="h-3 w-3 mr-1" /> Chi tiết
                                                      </Button>
                                                    )}

                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => {
                                                        const isTrans =
                                                          subOrder.inboundType === 'TRANSFER' ||
                                                          subOrder.orderCode?.startsWith('TRIP') ||
                                                          (subOrder.originHub && subOrder.destinationHub && subOrder.originHub !== subOrder.destinationHub) ||
                                                          (subOrder.trips && subOrder.trips.length > 0);
                                                        const orig =
                                                          subOrder.pickupAddress?.trim() ||
                                                          (isTrans ? subOrder.originHub : null) ||
                                                          subOrder.originHubEntity?.name ||
                                                          subOrder.originHub ||
                                                          (subOrder.route?.includes('→') ? subOrder.route.split('→')[0].trim() : '') ||
                                                          user?.hub?.name;
                                                        const dest =
                                                          subOrder.destinationHubEntity?.name ||
                                                          subOrder.destinationHub ||
                                                          subOrder.deliveryAddress?.trim() ||
                                                          (subOrder.route?.includes('→') ? subOrder.route.split('→')[1].trim() : '');
                                                        setSelectedLabelData({
                                                          orderCode: subOrder.orderCode,
                                                          goodsDescription: subOrder.goodsDescription || 'Hàng hóa nhập kho',
                                                          totalQuantity: subOrder.totalQuantity || 1,
                                                          originHub: orig,
                                                          destinationHub: dest,
                                                          createdAt: new Date(),
                                                        });
                                                        setIsLabelModalOpen(true);
                                                      }}
                                                      className="h-6 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 px-1.5 font-semibold"
                                                      title="In tem nhận diện A4"
                                                    >
                                                      <IconPrinter className="h-3 w-3 mr-1" /> In tem
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <TablePaginationBar
                    page={page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 50, 100]}
                    onPageChange={(newPage) => setPage(newPage)}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── View 2: Mode 1 - Nhập Kho Từ Khách Hàng (Frame WH_CASE_01) ── */}
        {activeView === 'MODE1_CUSTOMER' && (
          <div className="space-y-4">
            {/* Inbound Mode Switch Tabs (Frame SPiXE in WH_CASE_01) */}
            <div className="w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('MODE1_CUSTOMER')}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 font-bold shadow-sm"
              >
                Mới hoàn toàn
              </button>
              <button
                type="button"
                onClick={() => setActiveView('MODE2_TRANSFER')}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white"
              >
                Luân chuyển nội bộ
              </button>
            </div>

            {/* Khối Header Thông Tin Tiếp Nhận Tại Cửa Kho (3 Trường Bắt Buộc Viền Đỏ - Frame UVtv4) */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Ngày nhận */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    1. Ngày tiếp nhận <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <IconCalendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={receiveDate}
                      onChange={(e) => setReceiveDate(e.target.value)}
                      className="h-9 pl-8 text-xs border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900"
                    />
                  </div>
                </div>

                {/* 2. Biển số xe */}
                <div>
                  <label className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5">
                    2. Biển số xe <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <IconTruck className="absolute left-2.5 top-2.5 h-4 w-4 text-red-400" />
                    <Input
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="VD: 29C-123.45"
                      className="h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200"
                    />
                  </div>
                </div>

                {/* 3. Tài xế / Người giao (Không bắt buộc) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    3. Họ tên người nhận / tài xế <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <div className="relative">
                    <IconUser className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      className="h-9 pl-8 text-xs font-medium border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bảng kê hàng nhập kho 10 cột */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-4">
                <WarehouseEditableGrid
                  rows={mode1Rows}
                  onChange={setMode1Rows}
                  isOutboundMode={false}
                />

                {/* Sticky Action Footer (Frame ufHcR in WH_CASE_01) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {mode1Rows.length} dòng hàng
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraftMode1}
                      disabled={isSavingDraft || isSubmitting || mode1Rows.length === 0}
                      className="text-xs font-semibold h-9 border-slate-300 dark:border-slate-700"
                    >
                      {isSavingDraft ? (
                        <>
                          <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu nháp...
                        </>
                      ) : (
                        'Lưu nháp'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (mode1Rows.length > 0) {
                          const r = mode1Rows[0];
                          setSelectedLabelData({
                            orderCode: r.orderCode && r.orderCode !== '(Tự sinh khi lưu)' ? r.orderCode : 'LTV2609-0025',
                            goodsDescription: r.goodsDescription || 'Vải cuộn',
                            totalQuantity: r.totalQuantity || 50,
                            packagesOnPallet: r.totalQuantity || 50,
                            palletIndex: 1,
                            totalPallets: 1,
                            originHub: r.pickupAddress,
                            destinationHub: r.deliveryAddress,
                            createdAt: new Date(),
                          });
                          setIsLabelModalOpen(true);
                        }
                      }}
                      className="text-xs font-semibold h-9 border-slate-300 dark:border-slate-700"
                    >
                      Xem trước
                    </Button>

                    <Button
                      onClick={handleSubmitMode1}
                      disabled={isSubmitting || mode1Rows.length === 0}
                      className="bg-[#0F3D62] hover:bg-[#0c314f] text-white px-5 font-bold shadow-md h-9 text-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu dữ liệu...
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className="mr-1.5 h-4 w-4 text-emerald-400" /> Xác nhận tiếp nhận & Lưu kho
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── View 3: Mode 2 - Luân Chuyển Nội Bộ (Multi-Step Transfer Flow) ── */}
        {activeView === 'MODE2_TRANSFER' && (
          <WarehouseInboundTransferFlow
            onBackToBoard={() => setActiveView('BOARD')}
            onSwitchToCustomerMode={() => setActiveView('MODE1_CUSTOMER')}
            onSuccess={() => {
              setActiveView('BOARD');
              fetchInboundOrders();
              fetchKpi();
            }}
          />
        )}

        {/* ── Modal Chi Tiết Mã Vận Đơn (Waybill Details Modal) ── */}
        <WarehouseWaybillDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedWaybillForDetail(null);
          }}
          waybill={selectedWaybillForDetail}
          onStartTally={(waybill) => {
            setSelectedWaybillForTally(waybill);
            setIsTallyModalOpen(true);
          }}
          onPrintLabel={(waybill) => {
            const orig =
              waybill.pickupAddress?.trim() ||
              waybill.originHubEntity?.name ||
              waybill.originHub ||
              (waybill.route?.includes('→') ? waybill.route.split('→')[0].trim() : '') ||
              user?.hub?.name;
            const dest =
              waybill.destinationHubEntity?.name ||
              waybill.destinationHub ||
              waybill.deliveryAddress?.trim() ||
              (waybill.route?.includes('→') ? waybill.route.split('→')[1].trim() : '');
            setSelectedLabelData({
              orderCode: waybill.orderCode,
              goodsDescription: waybill.goodsDescription || 'Hàng hóa nhập kho',
              totalQuantity: waybill.totalQuantity || 1,
              originHub: orig,
              destinationHub: dest,
              createdAt: new Date(),
            });
            setIsLabelModalOpen(true);
          }}
        />

        {/* ── Modal Kiểm Đếm Nhập Kho (Frame SkFD5) ── */}
        <WarehouseTallyModal
          isOpen={isTallyModalOpen}
          onClose={() => {
            setIsTallyModalOpen(false);
            setSelectedWaybillForTally(null);
          }}
          waybill={selectedWaybillForTally}
          onSuccess={() => {
            fetchInboundOrders();
            fetchKpi();
          }}
          onPrintLabel={(waybill) => {
            const orig =
              waybill.pickupAddress?.trim() ||
              waybill.originHubEntity?.name ||
              waybill.originHub ||
              (waybill.route?.includes('→') ? waybill.route.split('→')[0].trim() : '') ||
              user?.hub?.name;
            const dest =
              waybill.destinationHubEntity?.name ||
              waybill.destinationHub ||
              waybill.deliveryAddress?.trim() ||
              (waybill.route?.includes('→') ? waybill.route.split('→')[1].trim() : '');
            setSelectedLabelData({
              orderCode: waybill.orderCode,
              goodsDescription: waybill.goodsDescription || 'Hàng hóa nhập kho',
              totalQuantity: waybill.totalQuantity || 1,
              originHub: orig,
              destinationHub: dest,
              createdAt: new Date(),
            });
            setIsLabelModalOpen(true);
          }}
        />

        {/* ── Modal In Tem A4 (Pallet Label A4 Modal) ── */}
        <PalletLabelA4Modal
          isOpen={isLabelModalOpen}
          onClose={() => {
            setIsLabelModalOpen(false);
            setSelectedLabelData(null);
          }}
          data={selectedLabelData}
        />

        {/* ── Modal In Phiếu Nhập Kho A4 ── */}
        <WarehouseInboundReceiptModal
          isOpen={isInboundReceiptModalOpen}
          onClose={() => {
            setIsInboundReceiptModalOpen(false);
            setSelectedReceiptData(null);
          }}
          data={selectedReceiptData}
        />
      </div>
    </PageContainer>
  );
}
