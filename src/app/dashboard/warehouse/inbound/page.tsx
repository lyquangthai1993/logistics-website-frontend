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
  IconFoldDown
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { useDebounce } from '@/hooks/use-debounce';
import {
  WarehouseEditableGrid,
  WarehouseRowItem
} from '@/features/warehouse/components/warehouse-editable-grid';
import { WarehouseInboundTransferFlow } from '@/features/warehouse/components/warehouse-inbound-transfer-flow';
import {
  PalletLabelA4Modal,
  PalletLabelData
} from '@/features/warehouse/components/pallet-label-a4-modal';
import {
  WarehouseInboundReceiptModal,
  InboundReceiptData,
  InboundReceiptItem
} from '@/features/warehouse/components/warehouse-inbound-receipt-modal';
import {
  WarehouseWaybillDetailModal,
  WaybillDetailData
} from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { WarehouseTallyModal } from '@/features/warehouse/components/warehouse-tally-modal';
import {
  WarehouseTripDetailModal,
  InboundVehicleGroup
} from '@/features/warehouse/components/warehouse-trip-detail-modal';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { TripStopStatusBadge } from '@/features/warehouse/components/trip-stop-status-badge';
import { formatWeight, formatVolume } from '@/lib/format';

export default function WarehouseInboundPage() {
  const user = useAuthStore((state) => state.user);

  // Active View State: 'BOARD' (sq2P6) | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>(
    'BOARD'
  );

  // Inbound Board State (sq2P6)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [boardStatus, setBoardStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [tripGroups, setTripGroups] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [tripCounts, setTripCounts] = useState({
    allCount: 0,
    pendingCount: 0,
    completedCount: 0
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWaybillForDetail, setSelectedWaybillForDetail] =
    useState<WaybillDetailData | null>(null);

  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedWaybillForTally, setSelectedWaybillForTally] = useState<WaybillDetailData | null>(
    null
  );

  // Vehicle Trip Detail & Tally Modal State
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTripGroup, setSelectedTripGroup] = useState<InboundVehicleGroup | null>(null);

  const handleOpenTripDetail = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripDetailModalOpen(true);
  };

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
      accompanyingDocs: '',
      notes: ''
    }
  ]);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // KPI Stats
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    inboundTotal: 0,
    outboundTotal: 0,
    waitingInbound: 0,
    customerInbound: 0,
    transferInbound: 0,
    storedInbound: 0,
    waitingOutbound: 0,
    completedOutboundToday: 0
  });

  // Fetch KPI
  const fetchKpi = useCallback(() => {
    const token = tokenManager.getAccessToken();
    fetch('/api/v1/warehouse/kpi', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
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

  // Reset page to 1 when search, status, or dates change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, boardStatus, fromDate, toDate]);

  // Fetch Inbound Board Trips with Pagination & 1:1 Parity Counters
  const fetchInboundTrips = useCallback(() => {
    setIsLoadingOrders(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(boardStatus !== 'ALL' ? { status: boardStatus } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {})
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
      .then((resData) => {
        const payload = resData?.meta ? resData : (resData?.data ?? resData);
        setTripGroups(payload?.data || []);
        setMeta({
          total: payload?.meta?.total ?? 0,
          totalPages: payload?.meta?.totalPages ?? 1
        });
        if (payload?.meta) {
          setTripCounts({
            allCount: payload.meta.allCount ?? 0,
            pendingCount: payload.meta.pendingCount ?? 0,
            completedCount: payload.meta.completedCount ?? 0
          });
        }
      })
      .catch(() => {
        setTripGroups([]);
        setMeta({ total: 0, totalPages: 1 });
      })
      .finally(() => setIsLoadingOrders(false));
  }, [page, pageSize, debouncedSearch, boardStatus, fromDate, toDate]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchInboundTrips();
    }
  }, [activeView, fetchInboundTrips]);

  // Collapsed / Expanded Vehicle Groups State
  const [expandedVehicleKeys, setExpandedVehicleKeys] = useState<Record<string, boolean>>({});

  const toggleExpandVehicle = (key: string) => {
    setExpandedVehicleKeys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Group inbound trips directly from backend response
  const vehicleGroups: InboundVehicleGroup[] = useMemo(
    () =>
      tripGroups.map((g) => {
        const descs = Array.from(
          new Set((g.orders ?? []).map((x: any) => x.goodsDescription).filter(Boolean))
        ) as string[];
        return {
          groupKey: g.tripCode || g.groupKey,
          licensePlate: g.licensePlate?.trim()?.toUpperCase() || 'CHƯA GÁN XE',
          driverName: g.driverName?.trim() || '',
          tripCode: g.tripCode || '—',
          receiveDate:
            typeof g.receiveDate === 'string'
              ? g.receiveDate.split('T')[0]
              : typeof g.pickupDate === 'string'
                ? g.pickupDate.split('T')[0]
                : undefined,
          status: g.status ?? 'PENDING',
          isTransfer: !!g.isTransfer,
          orders: g.orders ?? [],
          totalQuantity: Number(g.totalQuantity) || 0,
          totalWeight: Number(g.totalWeight) || 0,
          totalVolume: Number(g.totalVolume) || 0,
          goodsDescription:
            g.goodsDescription ||
            (descs.length === 0
              ? 'Hàng hóa tổng quan'
              : descs.length === 1
                ? descs[0]
                : `${descs[0]} (+${descs.length - 1} loại hàng)`),
          notes: g.notes || ''
        };
      }),
    [tripGroups]
  );

  const allVisibleOrders = useMemo(
    () => vehicleGroups.flatMap((g) => g.orders ?? []),
    [vehicleGroups]
  );

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
    // "Nhập tại kho" must be the receiving warehouse (the user's own hub first,
    // or the destination/current/origin hub entity), NEVER the customer's pickup address!
    const userHubId = user?.hub?.id;
    const userHubName = user?.hub?.name?.trim()?.toLowerCase() || '';

    // Filter orders to only those actually destined for or received at the current hub
    const isDestMatchingHub = (o: any) => {
      // If user has no assigned hub (e.g. SUPER_ADMIN viewing overall), keep all
      if (!userHubId && !userHubName) return true;

      // Match destinationHubId or currentHubId or destinationHub entity
      if (
        userHubId &&
        (o.destinationHubId === userHubId ||
          o.currentHubId === userHubId ||
          o.destinationHubEntity?.id === userHubId)
      ) {
        return true;
      }

      const destCandidates = [
        o.destinationHub,
        o.destinationHubEntity?.name,
        o.destinationHubEntity?.code
      ]
        .filter(Boolean)
        .map((s: string) => s.trim().toLowerCase());

      const userHubLower = userHubName.toLowerCase();

      for (const dest of destCandidates) {
        if (dest === userHubLower) return true;
        if (userHubLower.includes(dest) || dest.includes(userHubLower)) return true;

        // Abbreviation / alias matching (ĐN = Đà Nẵng, HY = Hưng Yên, HCM = TP. Hồ Chí Minh)
        const isUserDaNang =
          userHubLower.includes('đà nẵng') || userHubLower.includes('dad') || userHubId === 2;
        if (
          isUserDaNang &&
          (dest === 'đn' ||
            dest === 'dn' ||
            dest.includes('đà nẵng') ||
            dest.includes('da nang') ||
            dest.includes('dad'))
        ) {
          return true;
        }

        const isUserHungYen =
          userHubLower.includes('hưng yên') || userHubLower.includes('hyn') || userHubId === 3;
        if (
          isUserHungYen &&
          (dest === 'hy' ||
            dest.includes('hưng yên') ||
            dest.includes('hung yen') ||
            dest.includes('hyn'))
        ) {
          return true;
        }

        const isUserHcm =
          userHubLower.includes('hcm') ||
          userHubLower.includes('hồ chí minh') ||
          userHubLower.includes('sgn') ||
          userHubId === 1;
        if (
          isUserHcm &&
          (dest === 'hcm' ||
            dest === 'sgn' ||
            dest.includes('hồ chí minh') ||
            dest.includes('hcm') ||
            dest.includes('sài gòn'))
        ) {
          return true;
        }
      }

      // Check if any INBOUND transaction was completed at this hub
      if (Array.isArray(o.inventoryTransactions) && userHubId) {
        const hasHubInbound = o.inventoryTransactions.some(
          (tx: any) => tx.type === 'INBOUND' && (tx.hubId === userHubId || tx.hub?.id === userHubId)
        );
        if (hasHubInbound) return true;
      }
      return false;
    };

    const filteredOrders = (grp.orders || []).filter(isDestMatchingHub);

    const effectiveOrders = filteredOrders.length > 0 ? filteredOrders : grp.orders;
    const firstOrder = effectiveOrders[0] || grp.orders[0];

    const orig =
      user?.hub?.name ||
      firstOrder?.destinationHubEntity?.name ||
      firstOrder?.currentHubEntity?.name ||
      firstOrder?.originHubEntity?.name ||
      '';
    const dest =
      firstOrder?.destinationHubEntity?.name ||
      firstOrder?.destinationHub ||
      firstOrder?.deliveryAddress?.trim() ||
      '';

    const items: InboundReceiptItem[] = effectiveOrders.map((o: any) => ({
      orderCode: o.orderCode,
      goodsDescription: o.goodsDescription || 'Hàng hóa nhập kho',
      quantity: o.inboundQuantity ?? o.totalQuantity ?? 1,
      unit: 'Kiện',
      deliveryAddress: o.deliveryAddress || o.destinationHub || '—',
      accompanyingDocs: o.accompanyingDocs || 'KHÔNG CÓ',
      notes: o.notes || ''
    }));

    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    const totalWt = effectiveOrders.reduce(
      (sum: number, o: any) => sum + (Number(o.totalWeight) || 0),
      0
    );
    const totalVol = effectiveOrders.reduce(
      (sum: number, o: any) => sum + (Number(o.totalVolume) || 0),
      0
    );

    setSelectedReceiptData({
      tripCode: grp.tripCode !== '—' ? grp.tripCode : undefined,
      orderCode: effectiveOrders[0]?.orderCode || grp.orders[0]?.orderCode || grp.tripCode,
      goodsDescription:
        effectiveOrders.length === 1 ? effectiveOrders[0]?.goodsDescription : grp.goodsDescription,
      totalQuantity: totalQty,
      inboundQuantity: totalQty,
      totalWeight: totalWt > 0 ? totalWt : grp.totalWeight,
      totalVolume: totalVol > 0 ? totalVol : grp.totalVolume,
      originHub: orig,
      destinationHub: dest,
      pickupAddress: effectiveOrders[0]?.pickupAddress || grp.orders[0]?.pickupAddress,
      deliveryAddress: effectiveOrders[0]?.deliveryAddress || grp.orders[0]?.deliveryAddress,
      notes: grp.notes,
      driverName: grp.driverName,
      licensePlate: grp.licensePlate,
      createdAt: effectiveOrders[0]?.createdAt || grp.orders[0]?.createdAt || new Date(),
      items
    });
    setIsInboundReceiptModalOpen(true);
  };

  // Refresh Metrics Button Action
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = tokenManager.getAccessToken();

    try {
      const orderIds = allVisibleOrders
        .map((o) => Number(o.id))
        .filter((id) => !isNaN(id) && id > 0);
      if (orderIds.length > 0) {
        await fetch('/api/v1/orders/refresh-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ orderIds })
        });
      }
      fetchKpi();
      fetchInboundTrips();
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xác nhận nhập kho thành công cho ${selectedOrderIds.length} đơn hàng!`);
      setSelectedOrderIds([]);
      fetchKpi();
      fetchInboundTrips();
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
      if (!row.orderCode || !row.orderCode.trim()) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Mã vận đơn (bắt buộc)`);
        return;
      }
      if (!row.goodsDescription || !row.goodsDescription.trim()) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Tên loại hàng`);
        return;
      }
      if (!row.totalQuantity || Number(row.totalQuantity) < 1) {
        toast.error(`Dòng ${rowNum}: Số kiện phải lớn hơn hoặc bằng 1`);
        return;
      }
      if (
        row.totalWeight === undefined ||
        row.totalWeight === null ||
        Number(row.totalWeight) < 0
      ) {
        toast.error(`Dòng ${rowNum}: Số kg phải lớn hơn hoặc bằng 0`);
        return;
      }
      if (
        row.totalVolume === undefined ||
        row.totalVolume === null ||
        Number(row.totalVolume) < 0
      ) {
        toast.error(`Dòng ${rowNum}: Số khối m³ phải lớn hơn hoặc bằng 0`);
        return;
      }
      if (
        row.deliveryMode === 'DIRECT_CUSTOMER' &&
        (!row.deliveryAddress || !row.deliveryAddress.trim())
      ) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Địa chỉ giao hàng`);
        return;
      }
    }

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const itemsPayload = mode1Rows.map((row) => {
        const rawCode = row.orderCode?.trim() || '';
        const finalCode = rawCode.toUpperCase();

        return {
          orderCode: finalCode,
          goodsDescription: row.goodsDescription.trim(),
          totalQuantity: Number(row.totalQuantity) || 1,
          totalWeight: Number(row.totalWeight) || 0,
          totalVolume: Number(row.totalVolume) || 0,
          pickupAddress: row.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: row.deliveryAddress?.trim() || '',
          province: row.province?.trim() || undefined,
          accompanyingDocs: row.accompanyingDocs?.trim() || undefined,
          deliveryMode: row.deliveryMode || 'DIRECT_CUSTOMER',
          destinationHubId: row.destinationHubId || null,
          notes: row.notes?.trim() || undefined,
          initialStatus: 'INBOUND'
        };
      });

      const res = await fetch('/api/v1/warehouse/inbound/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          licensePlate: licensePlate.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          receiveDate: receiveDate || undefined,
          items: itemsPayload
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      const resJson = await res.json().catch(() => null);
      const batchResult = resJson?.data || resJson;

      toast.success(
        `Đã tiếp nhận thành công xe ${licensePlate.trim().toUpperCase()} (${mode1Rows.length} dòng hàng) - Mã chuyến: ${batchResult?.tripCode || 'TRIP'}!`
      );

      setMode1Rows([
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
          accompanyingDocs: '',
          notes: ''
        }
      ]);
      setLicensePlate('');
      setDriverName('');
      setActiveView('BOARD');
      fetchKpi();
      fetchInboundTrips();
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

    for (let i = 0; i < mode1Rows.length; i++) {
      const row = mode1Rows[i];
      const rowNum = i + 1;
      if (!row.orderCode || !row.orderCode.trim()) {
        toast.error(`Dòng ${rowNum}: Vui lòng nhập Mã vận đơn (bắt buộc)`);
        return;
      }
    }

    setIsSavingDraft(true);
    const token = tokenManager.getAccessToken();

    try {
      const itemsPayload = mode1Rows.map((row) => {
        const rawCode = row.orderCode?.trim() || '';
        const finalCode = rawCode.toUpperCase();

        return {
          orderCode: finalCode,
          goodsDescription: row.goodsDescription?.trim() || 'Hàng lưu kho (Nháp)',
          totalQuantity: Number(row.totalQuantity) > 0 ? Number(row.totalQuantity) : 1,
          totalWeight: Number(row.totalWeight) >= 0 ? Number(row.totalWeight) : 0,
          totalVolume: Number(row.totalVolume) >= 0 ? Number(row.totalVolume) : 0,
          pickupAddress: row.pickupAddress?.trim() || user?.hub?.name || '',
          deliveryAddress: row.deliveryAddress?.trim() || '',
          province: row.province?.trim() || undefined,
          accompanyingDocs: row.accompanyingDocs?.trim() || undefined,
          deliveryMode: row.deliveryMode || 'DIRECT_CUSTOMER',
          destinationHubId: row.destinationHubId || null,
          notes: row.notes?.trim() || undefined,
          initialStatus: 'DRAFT'
        };
      });

      const res = await fetch('/api/v1/warehouse/inbound/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          licensePlate: licensePlate.trim().toUpperCase(),
          driverName: driverName.trim() || undefined,
          receiveDate: receiveDate || undefined,
          items: itemsPayload
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã lưu nháp thành công ${mode1Rows.length} đơn hàng nhập kho!`);
      setMode1Rows([
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
          accompanyingDocs: '',
          notes: ''
        }
      ]);
      setLicensePlate('');
      setDriverName('');
      setActiveView('BOARD');
      setBoardStatus('PENDING');
      fetchKpi();
      fetchInboundTrips();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi lưu nháp đơn hàng');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className='space-y-2 flex-1 w-full min-w-0'>
        {/* ── Page Header (Frame sq2P6 parity) ── */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
          <div>
            <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
              <IconBuildingWarehouse className='h-6 w-6' />
              <span>Nhập kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
            </h1>
            <p className='text-xs text-slate-500 mt-0.5'>
              Quản lý luồng hàng nhập kho (Khách gửi trực tiếp hoặc Luân chuyển liên Hub).
            </p>
          </div>

          {activeView === 'BOARD' ? (
            <div className='flex items-center gap-2'>
              <Button
                onClick={() => setActiveView('MODE1_CUSTOMER')}
                className='bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm'
              >
                <IconPlus className='mr-1 h-4 w-4' /> Tạo đơn nhập mới
              </Button>
            </div>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setActiveView('BOARD')}
              className='text-xs font-semibold'
            >
              <IconX className='mr-1.5 h-4 w-4' /> Quay lại danh sách
            </Button>
          )}
        </div>

        {/* ── View 1: Main Inbound Board (Frame sq2P6 Danh sách nhập kho) ── */}
        {activeView === 'BOARD' && (
          <div className='space-y-1.5'>
            {/* Toolbar: Search, Status Tabs & Refresh Button */}
            <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
              <CardContent className='p-1 space-y-1.5'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  {/* Search Box & Date Range Filter */}
                  <div className='flex flex-wrap items-center gap-2 flex-1 min-w-[280px]'>
                    {/* Search Box */}
                    <div className='relative flex-1 min-w-[200px]'>
                      <IconSearch className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Tìm mã chuyến, xe, tài xế, mã đơn, tên hàng...'
                        className='pl-9 h-8.5 text-xs'
                      />
                    </div>

                    {/* Date Range: Từ ngày -> Đến ngày */}
                    <div className='flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700'>
                      <div className='flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium'>
                        <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
                        <span>Từ:</span>
                      </div>
                      <input
                        type='date'
                        aria-label='Từ ngày'
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(e) => setFromDate(e.target.value)}
                        className='px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                      />
                      <span className='text-slate-400 font-medium px-0.5'>đến:</span>
                      <input
                        type='date'
                        aria-label='Đến ngày'
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(e) => setToDate(e.target.value)}
                        className='px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                      />
                      {(fromDate || toDate) && (
                        <button
                          type='button'
                          onClick={() => {
                            setFromDate('');
                            setToDate('');
                          }}
                          className='text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 font-medium'
                          title='Xóa bộ lọc ngày'
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tier 1: Processing Status Tabs (trip status at this hub) */}
                  <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto'>
                    {[
                      { key: 'ALL', label: `Tất cả (${tripCounts.allCount ?? 0})` },
                      { key: 'PENDING', label: `Chờ xử lý (${tripCounts.pendingCount ?? 0})` },
                      { key: 'COMPLETED', label: `Đã xử lý (${tripCounts.completedCount ?? 0})` }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setBoardStatus(tab.key as typeof boardStatus);
                          setSelectedOrderIds([]);
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                          boardStatus === tab.key
                            ? 'bg-white text-[#0F3D62] shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                            : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Actions: Expand/Collapse All & Refresh Metrics */}
                  <div className='flex items-center gap-1.5'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={toggleAllGroups}
                      className='h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-50'
                      title={allExpanded ? 'Thu gọn tất cả xe' : 'Mở rộng tất cả xe'}
                    >
                      {allExpanded ? (
                        <>
                          <IconFoldUp className='mr-1.5 h-4 w-4 text-slate-600' />
                          <span>Thu gọn</span>
                        </>
                      ) : (
                        <>
                          <IconFoldDown className='mr-1.5 h-4 w-4 text-slate-600' />
                          <span>Mở rộng</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleRefreshMetrics}
                      disabled={isRefreshing}
                      className='h-8 text-xs font-bold border-slate-300'
                    >
                      <IconRefresh
                        className={`mr-1.5 h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                      <span>Làm mới</span>
                    </Button>
                  </div>
                </div>

                {/* Floating Batch Action Bar if rows selected */}
                {selectedOrderIds.length > 0 && (
                  <div className='flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900 text-xs animate-in fade-in duration-200'>
                    <span className='font-bold text-blue-900 dark:text-blue-200'>
                      Đã chọn {selectedOrderIds.length} đơn hàng
                    </span>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setSelectedOrderIds([])}
                        className='h-7 text-xs text-slate-600'
                      >
                        Bỏ chọn
                      </Button>
                      <Button
                        size='sm'
                        onClick={handleBatchConfirmInbound}
                        disabled={isBatchSubmitting}
                        className='h-7 text-xs font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f]'
                      >
                        {isBatchSubmitting ? (
                          <>
                            <IconLoader2 className='h-3.5 w-3.5 mr-1 animate-spin' /> Đang nhập
                            kho...
                          </>
                        ) : (
                          <>
                            <IconCircleCheck className='h-3.5 w-3.5 mr-1 text-emerald-400' /> Xác
                            nhận nhập kho {selectedOrderIds.length} đơn
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inbound Board Table (Frame sq2P6) */}
                <div className='border rounded-lg overflow-hidden'>
                  <table className='w-full text-[11px] text-left'>
                    <thead className='bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[10px]'>
                      <tr>
                        <th className='py-1.5 px-2 w-[36px] text-center'>
                          <input
                            type='checkbox'
                            checked={
                              allVisibleOrders.length > 0 &&
                              allVisibleOrders.every((o) => selectedOrderIds.includes(Number(o.id)))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(allVisibleOrders.map((o) => Number(o.id)));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className='rounded border-gray-300 text-blue-600 cursor-pointer'
                          />
                        </th>
                        <th className='py-1.5 px-2 w-[150px]'>CHUYẾN XE / TRIP</th>
                        <th className='py-1.5 px-2 w-[150px]'>XE & TÀI XẾ</th>
                        <th className='py-1.5 px-2 text-right w-[130px]'>SỐ KIỆN / TẢI TRỌNG</th>
                        <th className='py-1.5 px-2 w-[100px] text-center'>TRẠNG THÁI</th>
                        <th className='py-1.5 px-2 text-center w-[180px]'>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-800'>
                      {isLoadingOrders ? (
                        <tr>
                          <td colSpan={6} className='p-2 text-center text-gray-500'>
                            <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                            Đang tải danh sách đơn nhập kho...
                          </td>
                        </tr>
                      ) : vehicleGroups.length === 0 ? (
                        <tr>
                          <td colSpan={6} className='p-2 text-center text-gray-400'>
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

                          return (
                            <React.Fragment key={grp.groupKey}>
                              <tr className='hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors'>
                                <td className='py-1 px-2 text-center'>
                                  <input
                                    type='checkbox'
                                    checked={isGroupSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedOrderIds((prev) =>
                                          Array.from(new Set([...prev, ...groupOrderIds]))
                                        );
                                      } else {
                                        setSelectedOrderIds((prev) =>
                                          prev.filter((id) => !groupOrderIds.includes(id))
                                        );
                                      }
                                    }}
                                    className='rounded border-gray-300 text-blue-600 cursor-pointer'
                                  />
                                </td>
                                <td className='py-1 px-2'>
                                  <div className='flex items-center gap-1.5'>
                                    <button
                                      type='button'
                                      onClick={() => toggleExpandVehicle(grp.groupKey)}
                                      className='p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer'
                                      title={
                                        isExpanded
                                          ? 'Thu gọn danh sách đơn'
                                          : 'Xem chi tiết các đơn trên xe'
                                      }
                                    >
                                      {isExpanded ? (
                                        <IconChevronDown className='h-3.5 w-3.5 text-blue-600 font-bold' />
                                      ) : (
                                        <IconChevronRight className='h-3.5 w-3.5 text-slate-400' />
                                      )}
                                    </button>
                                    <div>
                                      <button
                                        type='button'
                                        onClick={() => handleOpenTripDetail(grp)}
                                        className='font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center transition-colors text-left'
                                        title='Nhấp để xem chi tiết chuyến xe'
                                      >
                                        <span>{grp.tripCode}</span>
                                        {grp.orders.length > 1 && (
                                          <Badge
                                            variant='outline'
                                            className='ml-1 text-[9px] px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 font-bold cursor-pointer'
                                          >
                                            {grp.orders.length} đơn
                                          </Badge>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className='py-1 px-2'>
                                  <div className='text-[11px] space-y-0.5'>
                                    <div className='font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1'>
                                      <IconTruck className='h-3 w-3 text-blue-600 shrink-0' />
                                      <span>{grp.licensePlate}</span>
                                    </div>
                                    {grp.driverName && (
                                      <div
                                        className='text-[10px] text-gray-500 truncate max-w-[140px]'
                                        title={grp.driverName}
                                      >
                                        {grp.driverName}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className='py-1 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-[11px]'>
                                  <div>{grp.totalQuantity} kiện</div>
                                  <div className='text-gray-400 text-[10px]'>
                                    {formatWeight(grp.totalWeight)} kg &bull;{' '}
                                    {formatVolume(grp.totalVolume)} m³
                                  </div>
                                </td>
                                <td className='py-1 px-2 text-center'>
                                  <TripStopStatusBadge status={grp.status} />
                                </td>
                                <td className='py-1 px-2 text-center'>
                                  <div className='flex items-center justify-center gap-1.5 flex-wrap'>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={() => handleOpenReceiptForVehicle(grp)}
                                      className='h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 px-2 font-semibold'
                                      title='In phiếu nhập xe (chứa tất cả đơn hàng của xe)'
                                    >
                                      <IconPrinter className='h-3.5 w-3.5 mr-1' /> In phiếu nhập
                                    </Button>

                                    <Button
                                      variant='ghost'
                                      size='sm'
                                      onClick={() => toggleExpandVehicle(grp.groupKey)}
                                      className='h-7 text-[11px] text-slate-600 hover:text-blue-700 px-1.5'
                                      title={isExpanded ? 'Thu gọn danh sách đơn' : 'Xem các đơn'}
                                    >
                                      {isExpanded ? 'Thu gọn' : 'Xem đơn'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* Nested Sub-row with all orders of this vehicle */}
                              {isExpanded && (
                                <tr className='bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800'>
                                  <td colSpan={6} className='py-1 px-2 pl-8'>
                                    <div className='bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-1.5 shadow-xs space-y-1'>
                                      <div className='flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300'>
                                        <span className='flex items-center gap-1'>
                                          <IconTruck className='h-3 w-3 text-blue-600' />
                                          <span>
                                            Chi tiết các đơn hàng thuộc xe {grp.licensePlate} (
                                            {grp.tripCode})
                                          </span>
                                        </span>
                                        <span>
                                          Tổng cộng: {grp.orders.length} đơn &bull;{' '}
                                          {grp.totalQuantity} kiện
                                        </span>
                                      </div>
                                      <table className='w-full text-[10px]'>
                                        <thead>
                                          <tr className='text-slate-400 text-[10px] border-b border-slate-100 dark:border-slate-700 text-left'>
                                            <th className='py-0.5 px-1.5 font-semibold w-[130px]'>
                                              MÃ VẬN ĐƠN
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold min-w-[160px]'>
                                              HÀNG HÓA
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-right w-[140px]'>
                                              SỐ KIỆN / TẢI TRỌNG
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-center w-[100px]'>
                                              CHỨNG TỪ
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold min-w-[180px]'>
                                              GHI CHÚ
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-center w-[150px]'>
                                              THAO TÁC
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100 dark:divide-slate-700'>
                                          {grp.orders.map((subOrder) => (
                                            <tr
                                              key={subOrder.id}
                                              className='hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            >
                                              <td className='py-1 px-1.5'>
                                                <button
                                                  type='button'
                                                  onClick={() => {
                                                    setSelectedWaybillForDetail(subOrder);
                                                    setIsDetailModalOpen(true);
                                                  }}
                                                  className='font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left block text-[10px]'
                                                  title='Xem chi tiết mã vận đơn'
                                                >
                                                  {subOrder.orderCode}
                                                </button>
                                              </td>
                                              <td className='py-1 px-1.5 font-medium text-slate-800 dark:text-slate-200 text-[10px]'>
                                                {subOrder.goodsDescription || 'Hàng hóa nhập kho'}
                                              </td>
                                              <td className='py-1 px-1.5 text-right font-semibold text-slate-700 dark:text-slate-300 text-[10px]'>
                                                <div>
                                                  {subOrder.inboundQuantity ??
                                                    subOrder.totalQuantity ??
                                                    1}{' '}
                                                  kiện
                                                </div>
                                                <div className='text-gray-400 text-[9px]'>
                                                  {formatWeight(subOrder.totalWeight)} kg &bull;{' '}
                                                  {formatVolume(subOrder.totalVolume)} m³
                                                </div>
                                              </td>
                                              <td className='py-1.5 px-2 text-center'>
                                                {subOrder.accompanyingDocs &&
                                                subOrder.accompanyingDocs.toUpperCase() !==
                                                  'KHÔNG CÓ' ? (
                                                  <Badge
                                                    variant='outline'
                                                    className='bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]'
                                                  >
                                                    {subOrder.accompanyingDocs}
                                                  </Badge>
                                                ) : (
                                                  <Badge
                                                    variant='outline'
                                                    className='bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px]'
                                                  >
                                                    {subOrder.accompanyingDocs || 'Không có'}
                                                  </Badge>
                                                )}
                                              </td>
                                              <td
                                                className='py-1.5 px-2 text-slate-500 text-[11px] truncate max-w-[180px]'
                                                title={subOrder.notes}
                                              >
                                                {subOrder.notes || '—'}
                                              </td>
                                              <td className='py-1.5 px-2 text-center'>
                                                <div className='flex items-center justify-center gap-1'>
                                                  <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => {
                                                      setSelectedWaybillForDetail(subOrder);
                                                      setIsDetailModalOpen(true);
                                                    }}
                                                    className='h-6 text-[10px] px-1.5 text-slate-600 hover:text-blue-700 font-semibold'
                                                  >
                                                    <IconEye className='h-3 w-3 mr-1' /> Chi tiết
                                                  </Button>

                                                  <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => {
                                                      const isTrans =
                                                        subOrder.inboundType === 'TRANSFER' ||
                                                        subOrder.orderCode?.startsWith('TRIP') ||
                                                        (subOrder.originHub &&
                                                          subOrder.destinationHub &&
                                                          subOrder.originHub !==
                                                            subOrder.destinationHub) ||
                                                        (subOrder.trips &&
                                                          subOrder.trips.length > 0);
                                                      const orig =
                                                        subOrder.pickupAddress?.trim() ||
                                                        (isTrans ? subOrder.originHub : null) ||
                                                        subOrder.originHubEntity?.name ||
                                                        subOrder.originHub ||
                                                        (subOrder.route?.includes('→')
                                                          ? subOrder.route.split('→')[0].trim()
                                                          : '') ||
                                                        user?.hub?.name;
                                                      const dest =
                                                        subOrder.destinationHubEntity?.name ||
                                                        subOrder.destinationHub ||
                                                        subOrder.deliveryAddress?.trim() ||
                                                        (subOrder.route?.includes('→')
                                                          ? subOrder.route.split('→')[1].trim()
                                                          : '');
                                                      setSelectedLabelData({
                                                        orderCode: subOrder.orderCode,
                                                        goodsDescription:
                                                          subOrder.goodsDescription ||
                                                          'Hàng hóa nhập kho',
                                                        totalQuantity: subOrder.totalQuantity || 1,
                                                        originHub: orig,
                                                        destinationHub: dest,
                                                        province: subOrder.province || subOrder.destinationHubEntity?.city || dest,
                                                        destinationHubEntity: subOrder.destinationHubEntity,
                                                        warehouseName:
                                                          subOrder.currentHubEntity?.name,
                                                        createdAt: new Date()
                                                      });
                                                      setIsLabelModalOpen(true);
                                                    }}
                                                    className='h-6 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 px-1.5 font-semibold'
                                                    title='In tem nhận diện A4'
                                                  >
                                                    <IconPrinter className='h-3 w-3 mr-1' /> In tem
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
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
                <div className='pt-2 border-t border-slate-100 dark:border-slate-800'>
                  <TablePaginationBar
                    page={page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    pageSize={pageSize}
                    unitLabel='chuyến xe'
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
          <div className='space-y-1.5'>
            {/* Inbound Mode Switch Tabs (Frame SPiXE in WH_CASE_01) */}
            <div className='w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner'>
              <button
                type='button'
                onClick={() => setActiveView('MODE1_CUSTOMER')}
                className='flex-1 py-1.5 px-3 rounded-lg text-xs transition-all bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 font-bold shadow-sm'
              >
                Mới hoàn toàn
              </button>
              <button
                type='button'
                onClick={() => setActiveView('MODE2_TRANSFER')}
                className='flex-1 py-1.5 px-3 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white'
              >
                Luân chuyển nội bộ
              </button>
            </div>

            {/* Khối Header Thông Tin Tiếp Nhận Tại Cửa Kho (3 Trường Bắt Buộc Viền Đỏ - Frame UVtv4) */}
            <Card className='bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 py-0'>
              <CardContent className='p-1 grid grid-cols-1 md:grid-cols-3 gap-2'>
                {/* 1. Ngày nhận */}
                <div>
                  <label className='text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1'>
                    1. Ngày tiếp nhận <span className='text-red-600 font-black'>*</span>
                  </label>
                  <div className='relative'>
                    <IconCalendar className='absolute left-2.5 top-2.5 h-4 w-4 text-gray-400' />
                    <Input
                      type='date'
                      value={receiveDate}
                      onChange={(e) => setReceiveDate(e.target.value)}
                      className='h-9 pl-8 text-xs border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900'
                    />
                  </div>
                </div>

                {/* 2. Biển số xe */}
                <div>
                  <label className='text-xs font-bold text-red-600 dark:text-red-400 block mb-1'>
                    2. Biển số xe <span className='text-red-600 font-black'>*</span>
                  </label>
                  <div className='relative'>
                    <IconTruck className='absolute left-2.5 top-2.5 h-4 w-4 text-red-400' />
                    <Input
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder='VD: 29C-123.45'
                      className='h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
                    />
                  </div>
                </div>

                {/* 3. Tài xế / Người giao (Không bắt buộc) */}
                <div>
                  <label className='text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1'>
                    3. Họ tên người nhận / tài xế{' '}
                    <span className='text-slate-400 font-normal'>(Tùy chọn)</span>
                  </label>
                  <div className='relative'>
                    <IconUser className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400' />
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder='VD: Nguyễn Văn A'
                      className='h-9 pl-8 text-xs font-medium border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bảng kê hàng nhập kho 10 cột */}
            <Card className='bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 py-0'>
              <CardContent className='p-1 space-y-2.5'>
                <WarehouseEditableGrid
                  rows={mode1Rows}
                  onChange={setMode1Rows}
                  isOutboundMode={false}
                />

                {/* Sticky Action Footer (Frame ufHcR in WH_CASE_01) */}
                <div className='flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800'>
                  <span className='text-xs font-semibold text-slate-500 dark:text-slate-400'>
                    {mode1Rows.length} dòng hàng
                  </span>

                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleSaveDraftMode1}
                      disabled={isSavingDraft || isSubmitting || mode1Rows.length === 0}
                      className='text-xs font-semibold h-9 border-slate-300 dark:border-slate-700'
                    >
                      {isSavingDraft ? (
                        <>
                          <IconLoader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' /> Đang lưu
                          nháp...
                        </>
                      ) : (
                        'Lưu nháp'
                      )}
                    </Button>

                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        if (mode1Rows.length > 0) {
                          const r = mode1Rows[0];
                          setSelectedLabelData({
                            orderCode:
                              r.orderCode && r.orderCode !== '(Tự sinh khi lưu)'
                                ? r.orderCode
                                : '(Tự sinh khi lưu)',
                            goodsDescription: r.goodsDescription || '',
                            totalQuantity: Number(r.totalQuantity) || 0,
                            packagesOnPallet: Number(r.totalQuantity) || 0,
                            palletIndex: 1,
                            totalPallets: 1,
                            originHub: r.pickupAddress,
                            destinationHub: r.deliveryAddress,
                            province: r.province || r.deliveryAddress,
                            createdAt: new Date()
                          });
                          setIsLabelModalOpen(true);
                        }
                      }}
                      className='text-xs font-semibold h-9 border-slate-300 dark:border-slate-700'
                    >
                      Xem trước
                    </Button>

                    <Button
                      onClick={handleSubmitMode1}
                      disabled={isSubmitting || mode1Rows.length === 0}
                      className='bg-[#0F3D62] hover:bg-[#0c314f] text-white px-5 font-bold shadow-md h-9 text-xs'
                    >
                      {isSubmitting ? (
                        <>
                          <IconLoader2 className='mr-2 h-4 w-4 animate-spin' /> Đang lưu dữ liệu...
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className='mr-1.5 h-4 w-4 text-emerald-400' /> Xác nhận
                          tiếp nhận & Lưu kho
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
              fetchInboundTrips();
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
              province: waybill.province || waybill.destinationHubEntity?.city || dest,
              destinationHubEntity: waybill.destinationHubEntity,
              warehouseName: waybill.currentHubEntity?.name,
              createdAt: new Date()
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
            fetchInboundTrips();
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
              province: waybill.province || waybill.destinationHubEntity?.city || dest,
              destinationHubEntity: waybill.destinationHubEntity,
              warehouseName: waybill.currentHubEntity?.name,
              createdAt: new Date()
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

        {/* ── Modal Chi Tiết & Kiểm Đếm Chuyến Xe Nhập Kho ── */}
        <WarehouseTripDetailModal
          isOpen={isTripDetailModalOpen}
          onClose={() => {
            setIsTripDetailModalOpen(false);
            setSelectedTripGroup(null);
          }}
          tripGroup={selectedTripGroup}
          onSuccess={() => {
            fetchInboundTrips();
            fetchKpi();
          }}
          onOpenReceipt={handleOpenReceiptForVehicle}
        />
      </div>
    </PageContainer>
  );
}
