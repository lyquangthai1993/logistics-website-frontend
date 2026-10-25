'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  IconPencil,
  IconCircleCheck,
  IconClipboardCheck,
  IconEye,
  IconX,
  IconTrash,
  IconFileSpreadsheet,
  IconRotate
} from '@tabler/icons-react';
import { rollbackTrip } from '@/features/warehouse/api/trip-manifest';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
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
  InboundReceiptItem,
  resolveInboundReceiptDeliveryAddress
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
import {
  TripStopStatusBadge,
  toTripStopStatus
} from '@/features/warehouse/components/trip-stop-status-badge';
import { formatWeight, formatVolume } from '@/lib/format';

export default function WarehouseInboundPage() {
  const user = useAuthStore((state) => state.user);

  // Active View State: 'BOARD' (sq2P6) | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>(
    'BOARD'
  );

  // Inbound Board State (sq2P6)
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const handleSearchSubmit = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleClearSearch = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };
  const [boardStatus, setBoardStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Date Range Filter: Default from 1st of current month to today (aligned with Outbound & URL params)
  const getDefaultFromDate = () => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qFrom = sp.get('fromDate');
      if (qFrom && /^\d{4}-\d{2}-\d{2}$/.test(qFrom)) return qFrom;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getDefaultToDate = () => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qTo = sp.get('toDate');
      if (qTo && /^\d{4}-\d{2}-\d{2}$/.test(qTo)) return qTo;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [appliedFromDate, setAppliedFromDate] = useState(getDefaultFromDate);
  const [appliedToDate, setAppliedToDate] = useState(getDefaultToDate);

  const handleApplyDateRange = () => {
    setPage(1);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleResetDateRange = () => {
    const d = new Date();
    const defFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const defTo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFromDate(defFrom);
    setToDate(defTo);
    setAppliedFromDate(defFrom);
    setAppliedToDate(defTo);
    setPage(1);
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [tripGroups, setTripGroups] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [tripCounts, setTripCounts] = useState({
    allCount: 0,
    pendingCount: 0,
    completedCount: 0
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWaybillForDetail, setSelectedWaybillForDetail] =
    useState<WaybillDetailData | null>(null);

  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedWaybillForTally, setSelectedWaybillForTally] = useState<WaybillDetailData | null>(
    null
  );

  // Vehicle Trip Detail & Tally Modal State (Separated View & Edit/Resume)
  const [isTripViewModalOpen, setIsTripViewModalOpen] = useState(false);
  const [isTripEditModalOpen, setIsTripEditModalOpen] = useState(false);
  const [selectedTripGroup, setSelectedTripGroup] = useState<InboundVehicleGroup | null>(null);

  const handleOpenTripDetail = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripViewModalOpen(true);
  };

  const handleResumeInboundTrip = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripEditModalOpen(true);
  };

  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    (user?.role as any)?.id === 1 ||
    (user?.role as any)?.name === 'SUPER_ADMIN';

  const handleRollbackTrip = async (grp: InboundVehicleGroup) => {
    if (!grp?.tripCode || grp.tripCode === '—') return;
    if (
      !window.confirm(
        `Xác nhận mở lại chuyến xe ${grp.tripCode}? Toàn bộ số lượng kiện hàng đã dỡ vào kho sẽ được hoàn tác khỏi tồn kho và các đơn hàng quay lại trạng thái Chờ xử lý.`
      )
    ) {
      return;
    }
    try {
      const activeHubId = Number(user?.hubId ?? (user?.hub as any)?.id) || undefined;
      await rollbackTrip(grp.tripCode, {
        hubId: activeHubId,
        reason: 'Admin mở lại chuyến xe nhập kho từ bảng danh sách'
      });
      toast.success(`Đã mở lại chuyến xe ${grp.tripCode} về trạng thái Chờ xử lý!`);
      fetchInboundTrips();
      fetchKpi();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi mở lại chuyến xe');
    }
  };

  const [cancellingDraftCode, setCancellingDraftCode] = useState<string | null>(null);

  // "Hủy nháp": drops the draft inbound trip (soft deletes trip_stop & pending draft orders)
  const handleCancelDraft = async (tripCode: string) => {
    if (
      !window.confirm(
        `Hủy chuyến nháp ${tripCode}? Các dòng hàng dự kiến nhập sẽ bị hủy khỏi chuyến.`
      )
    ) {
      return;
    }
    setCancellingDraftCode(tripCode);
    const token = tokenManager.getAccessToken();
    try {
      const res = await fetch(`/api/v1/warehouse/inbound/drafts/${encodeURIComponent(tripCode)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }
      toast.success(`Đã hủy chuyến nháp ${tripCode}`);
      fetchKpi();
      fetchInboundTrips();
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể hủy chuyến nháp');
    } finally {
      setCancellingDraftCode(null);
    }
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

  const emptyWarehouseRow = (): WarehouseRowItem => ({
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
  });

  // Mode 1 Rows (Pure Clean Initial State for Warehouse Intake)
  const [mode1Rows, setMode1Rows] = useState<WarehouseRowItem[]>([emptyWarehouseRow()]);

  // Centralized reset function for Mode 1 trip intake
  const resetMode1Form = useCallback(() => {
    setLicensePlate('');
    setDriverName('');
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setMode1Rows([emptyWarehouseRow()]);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('TMS_INBOUND_CONVERTER_TRANSFER');
      }
    } catch {}
  }, []);

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

  // Tự động nạp dữ liệu chuyển đổi từ Công cụ Excel nếu có
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('TMS_INBOUND_CONVERTER_TRANSFER');
      if (stored) {
        const payload = JSON.parse(stored);
        sessionStorage.removeItem('TMS_INBOUND_CONVERTER_TRANSFER');
        if (payload.receiveDate) setReceiveDate(payload.receiveDate);
        if (payload.licensePlate) setLicensePlate(payload.licensePlate);
        if (payload.driverName) setDriverName(payload.driverName);
        if (payload.rows && payload.rows.length > 0) {
          setMode1Rows(payload.rows);
          setActiveView('MODE1_CUSTOMER');
          toast.success(
            `Đã tiếp nhận ${payload.rows.length} dòng đơn từ Công cụ chuyển đổi Excel!`
          );
        }
      }
    } catch (e) {
      console.error('Lỗi nạp dữ liệu từ converter:', e);
    }
  }, []);

  // Đồng bộ ngày từ URL searchParams nếu có (e.g. ?fromDate=2026-10-01&toDate=2026-10-25)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qFrom = sp.get('fromDate');
      const qTo = sp.get('toDate');
      if (qFrom && /^\d{4}-\d{2}-\d{2}$/.test(qFrom)) {
        setFromDate(qFrom);
        setAppliedFromDate(qFrom);
      }
      if (qTo && /^\d{4}-\d{2}-\d{2}$/.test(qTo)) {
        setToDate(qTo);
        setAppliedToDate(qTo);
      }
    }
  }, []);

  // Reset page to 1 when search, status, or applied dates change
  useEffect(() => {
    setPage(1);
  }, [appliedSearch, boardStatus, appliedFromDate, appliedToDate]);

  // Fetch Inbound Board Trips with Pagination & 1:1 Parity Counters
  const fetchInboundTrips = useCallback(() => {
    setIsLoadingOrders(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(appliedSearch.trim() ? { search: appliedSearch.trim() } : {}),
      ...(boardStatus !== 'ALL' ? { status: boardStatus } : {}),
      ...(appliedFromDate ? { fromDate: appliedFromDate } : {}),
      ...(appliedToDate ? { toDate: appliedToDate } : {})
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
  }, [page, pageSize, appliedSearch, boardStatus, appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchInboundTrips();
    }
  }, [activeView, fetchInboundTrips]);

  const formatTripDate = (raw?: string) => {
    if (!raw) return '—';
    const clean = String(raw).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return clean || '—';
  };

  // Group inbound trips directly from backend response
  const vehicleGroups: InboundVehicleGroup[] = useMemo(
    () =>
      tripGroups.map((g) => {
        const descs = Array.from(
          new Set((g.orders ?? []).map((x: any) => x.goodsDescription).filter(Boolean))
        ) as string[];
        const rawDate =
          g.receiveDate || g.pickupDate || g.processedAt || g.createdAt || g.orders?.[0]?.createdAt;
        return {
          groupKey: g.tripCode || g.groupKey,
          licensePlate: g.licensePlate?.trim()?.toUpperCase() || 'CHƯA GÁN XE',
          driverName: g.driverName?.trim() || '',
          tripCode: g.tripCode || '—',
          receiveDate: rawDate ? String(rawDate).split('T')[0] : undefined,
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
          notes: g.notes || '',
          hubId: g.hubId ? Number(g.hubId) : undefined
        };
      }),
    [tripGroups]
  );

  const allVisibleOrders = useMemo(
    () => vehicleGroups.flatMap((g) => g.orders ?? []),
    [vehicleGroups]
  );

  useEffect(() => {
    if (!selectedTripGroup) return;
    const updated = vehicleGroups.find(
      (g) =>
        (g.tripCode && g.tripCode !== '—' && g.tripCode === selectedTripGroup.tripCode) ||
        g.groupKey === selectedTripGroup.groupKey
    );
    if (updated) {
      setSelectedTripGroup(updated);
    }
  }, [vehicleGroups]);

  const handleOpenReceiptForVehicle = (grp: InboundVehicleGroup) => {
    // "Nhập tại kho" must be the receiving warehouse (the user's own hub first,
    // or the destination/current/origin hub entity), NEVER the customer's pickup address!
    const userHubId = user?.hub?.id;
    const userHubName = user?.hub?.name?.trim()?.toLowerCase() || '';

    // Filter orders to only those actually destined for or received at the current hub
    const isDestMatchingHub = (o: any) => {
      // If user has no assigned hub (e.g. SUPER_ADMIN viewing overall), keep all
      if (!userHubId && !userHubName) return true;

      // When the trip was completed at this hub, ALL orders carried on this vehicle
      // for this stop were received into this warehouse. Historical inbound receipt MUST reflect
      // all orders that were received, regardless of whether some have been subsequently exported out!
      if (grp.status === 'COMPLETED') return true;

      // Check if any INBOUND transaction was completed at this hub or for this trip
      if (Array.isArray(o.inventoryTransactions) && (userHubId || grp.tripCode)) {
        const hasHubInbound = o.inventoryTransactions.some(
          (tx: any) =>
            tx.type === 'INBOUND' &&
            ((userHubId && (tx.hubId === userHubId || tx.hub?.id === userHubId)) ||
              (grp.tripCode && grp.tripCode !== '—' && tx.tripCode === grp.tripCode))
        );
        if (hasHubInbound) return true;
      }

      // Match destinationHubId or currentHubId or destinationHub entity
      // Note: destinationHubId === null represents direct customer delivery from the receiving hub
      if (
        userHubId &&
        (o.destinationHubId === userHubId ||
          o.destinationHubId == null ||
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

    const getOrderTripInboundQty = (o: any) => {
      if (Array.isArray(o.inventoryTransactions) && grp.tripCode && grp.tripCode !== '—') {
        const tx = o.inventoryTransactions.find(
          (t: any) =>
            t.type === 'INBOUND' &&
            (t.tripCode === grp.tripCode || (t.tripCode && grp.tripCode.includes(t.tripCode)))
        );
        if (tx && Number(tx.quantity) > 0) return Number(tx.quantity);
      }
      return o.inboundQuantity ?? o.totalQuantity ?? 1;
    };

    const items: InboundReceiptItem[] = effectiveOrders.map((o: any) => ({
      orderCode: o.orderCode,
      goodsDescription: o.goodsDescription || 'Hàng hóa nhập kho',
      quantity: getOrderTripInboundQty(o),
      unit: 'Kiện',
      deliveryAddress: resolveInboundReceiptDeliveryAddress(o),
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
      createdAt:
        grp.receiveDate || effectiveOrders[0]?.createdAt || grp.orders[0]?.createdAt || new Date(),
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
          hubId: Number(user?.hubId ?? (user?.hub as any)?.id) || 1,
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

      // Tự động chuẩn bị dữ liệu và hiển thị ngay Modal Phiếu Nhập Kho A4
      const totalQty = mode1Rows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 1), 0);
      const totalWt = mode1Rows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0);
      const totalVol = mode1Rows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0);
      const descs = Array.from(new Set(mode1Rows.map((r) => r.goodsDescription).filter(Boolean)));
      const goodsDesc =
        descs.length === 1
          ? descs[0]
          : descs.length > 1
            ? `${descs[0]} (+${descs.length - 1} loại hàng)`
            : 'Hàng hóa nhập kho';

      const receiptItems: InboundReceiptItem[] = mode1Rows.map((r) => ({
        orderCode: r.orderCode.trim().toUpperCase(),
        goodsDescription: r.goodsDescription.trim() || 'Hàng hóa nhập kho',
        quantity: Number(r.totalQuantity) || 1,
        unit: 'Kiện',
        deliveryAddress: r.deliveryAddress?.trim() || user?.hub?.name || '—',
        accompanyingDocs: r.accompanyingDocs?.trim() || 'KHÔNG CÓ',
        notes: r.notes?.trim() || ''
      }));

      const receiptData: InboundReceiptData = {
        tripCode: batchResult?.tripCode || undefined,
        orderCode:
          batchResult?.invoiceCode ||
          batchResult?.orders?.[0]?.orderCode ||
          mode1Rows[0]?.orderCode?.trim()?.toUpperCase() ||
          'INBOUND',
        goodsDescription: goodsDesc,
        totalQuantity: totalQty,
        inboundQuantity: totalQty,
        totalWeight: totalWt,
        totalVolume: totalVol,
        licensePlate: licensePlate.trim().toUpperCase(),
        driverName: driverName.trim(),
        originHub: user?.hub?.name || '',
        destinationHub: mode1Rows[0]?.deliveryAddress?.trim() || user?.hub?.name || '',
        createdAt: receiveDate || new Date(),
        items: receiptItems
      };

      setSelectedReceiptData(receiptData);
      setIsInboundReceiptModalOpen(true);

      resetMode1Form();
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
          hubId: Number(user?.hubId ?? (user?.hub as any)?.id) || undefined,
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
      resetMode1Form();
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
            <div className='flex flex-wrap items-center gap-2.5'>
              <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
                <IconBuildingWarehouse className='h-6 w-6 shrink-0' />
                <span>Nhập kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
              </h1>
              {activeView === 'BOARD' && (
                <>
                  <Button
                    onClick={() => {
                      resetMode1Form();
                      setActiveView('MODE1_CUSTOMER');
                    }}
                    className='bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm h-8 px-2.5'
                  >
                    <IconPlus className='mr-1 h-4 w-4' /> Tạo đơn nhập mới
                  </Button>
                  <Link href='/dashboard/warehouse/excel-converter'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs font-semibold border-slate-300 dark:border-slate-700 shadow-xs'
                    >
                      <IconFileSpreadsheet className='mr-1.5 h-4 w-4 text-emerald-600' />
                      Chuyển đổi Excel điều hành
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <p className='text-xs text-slate-500 mt-0.5'>
              Quản lý luồng hàng nhập kho (Khách gửi trực tiếp hoặc Luân chuyển liên Hub).
            </p>
          </div>

          {activeView !== 'BOARD' && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                resetMode1Form();
                setActiveView('BOARD');
              }}
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
                      <button
                        type='button'
                        onClick={handleSearchSubmit}
                        className='absolute left-3 top-2.5 text-gray-400 hover:text-[#0F3D62] dark:hover:text-blue-400 transition-colors'
                        title='Nhấn để tìm kiếm'
                      >
                        <IconSearch className='h-4 w-4' />
                      </button>
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder='Tìm mã chuyến, xe, tài xế, mã đơn, tên hàng... (Nhấn Enter để tìm)'
                        className='pl-9 pr-8 h-8.5 text-xs'
                      />
                      {search && (
                        <button
                          type='button'
                          onClick={handleClearSearch}
                          className='absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          title='Xóa tìm kiếm'
                        >
                          <IconX className='h-3.5 w-3.5' />
                        </button>
                      )}
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
                      <Button
                        type='button'
                        size='sm'
                        onClick={handleApplyDateRange}
                        className='h-7 px-2.5 text-xs font-semibold bg-[#0F3D62] hover:bg-[#0c2f4d] text-white shadow-xs cursor-pointer'
                        title='Áp dụng bộ lọc theo khoảng thời gian'
                      >
                        Áp dụng
                      </Button>
                      {(appliedFromDate !== getDefaultFromDate() ||
                        appliedToDate !== getDefaultToDate()) && (
                        <button
                          type='button'
                          onClick={handleResetDateRange}
                          className='text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 font-medium cursor-pointer'
                          title='Đặt lại về tháng này'
                        >
                          Đặt lại
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

                {/* Inbound Board Table (Frame sq2P6) */}
                <div className='border rounded-lg overflow-hidden'>
                  <table className='w-full text-[11px] text-left'>
                    <thead className='bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[10px]'>
                      <tr>
                        <th className='py-1.5 px-2 w-[85px] whitespace-nowrap'>NGÀY</th>
                        <th className='py-1.5 px-2 w-[115px] whitespace-nowrap'>
                          CHUYẾN XE / TRIP
                        </th>
                        <th className='py-1.5 px-2 w-[160px]'>XE & TÀI XẾ</th>
                        <th className='py-1.5 px-2 min-w-[240px]'>MÃ VẬN ĐƠN</th>
                        <th className='py-1.5 px-2 text-right w-[130px]'>SỐ KIỆN / TẢI TRỌNG</th>
                        <th className='py-1.5 px-2 w-[100px] text-center'>TRẠNG THÁI</th>
                        <th className='py-1.5 px-2 text-center w-[180px]'>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-800'>
                      {isLoadingOrders ? (
                        <tr>
                          <td colSpan={7} className='p-2 text-center text-gray-500'>
                            <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                            Đang tải danh sách đơn nhập kho...
                          </td>
                        </tr>
                      ) : vehicleGroups.length === 0 ? (
                        <tr>
                          <td colSpan={7} className='p-2 text-center text-gray-400'>
                            Không có chuyến xe nhập kho phù hợp bộ lọc
                          </td>
                        </tr>
                      ) : (
                        vehicleGroups.map((grp) => {
                          const isPending = toTripStopStatus(grp.status) === 'PENDING';
                          const orderCodes = Array.from(
                            new Set(
                              (grp.orders ?? [])
                                .map((o: any) => (o.orderCode || '').trim())
                                .filter((code: string) => code && code !== '(Tự sinh khi lưu)')
                            )
                          );

                          return (
                            <tr
                              key={grp.groupKey}
                              className='hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors'
                            >
                              <td className='py-1 px-2 w-[85px] whitespace-nowrap align-top text-[10px] font-medium text-slate-600 dark:text-slate-400'>
                                {formatTripDate(grp.receiveDate)}
                              </td>
                              <td className='py-1 px-2 w-[115px] whitespace-nowrap align-top'>
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
                              </td>
                              <td className='py-1 px-2 w-[160px] align-top'>
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
                              <td className='py-1 px-2 min-w-[240px] align-top'>
                                {orderCodes.length > 0 ? (
                                  <div
                                    className='text-[10px] text-gray-500 dark:text-slate-400 leading-snug break-words'
                                    title={orderCodes.join(', ')}
                                  >
                                    {orderCodes.join(', ')}
                                  </div>
                                ) : (
                                  <span className='text-[10px] text-gray-400 italic'>—</span>
                                )}
                              </td>
                              <td className='py-1 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-[11px] align-top'>
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
                                  {isPending ? (
                                    <>
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleResumeInboundTrip(grp)}
                                        className='h-7 text-[11px] text-[#0F3D62] border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 px-2 font-semibold'
                                        title='Mở trip nhập kho để kiểm đếm, chỉnh sửa hoặc xác nhận nhập kho'
                                      >
                                        <IconPencil className='h-3.5 w-3.5 mr-1' /> Tiếp tục
                                      </Button>
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleCancelDraft(grp.tripCode)}
                                        disabled={cancellingDraftCode === grp.tripCode}
                                        className='h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 px-2 font-semibold'
                                        title='Hủy chuyến nháp (chưa xác nhận nhập kho)'
                                      >
                                        {cancellingDraftCode === grp.tripCode ? (
                                          <IconLoader2 className='h-3.5 w-3.5 mr-1 animate-spin' />
                                        ) : (
                                          <IconTrash className='h-3.5 w-3.5 mr-1' />
                                        )}
                                        Hủy nháp
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      {isAdmin && (
                                        <Button
                                          variant='outline'
                                          size='sm'
                                          onClick={() => handleRollbackTrip(grp)}
                                          className='h-7 text-[11px] text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-800 px-2 font-semibold'
                                          title='Mở lại chuyến xe (Rollback về Chờ xử lý)'
                                        >
                                          <IconRotate className='h-3.5 w-3.5 mr-1' /> Mở lại
                                        </Button>
                                      )}
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleOpenReceiptForVehicle(grp)}
                                        className='h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 px-2 font-semibold'
                                        title='In phiếu nhập xe (chứa tất cả đơn hàng của xe)'
                                      >
                                        <IconPrinter className='h-3.5 w-3.5 mr-1' /> In phiếu nhập
                                      </Button>
                                    </>
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
                onClick={() => {
                  resetMode1Form();
                  setActiveView('MODE2_TRANSFER');
                }}
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
                      onClick={() => {
                        resetMode1Form();
                        setActiveView('BOARD');
                      }}
                      className='text-xs font-semibold h-8 border-slate-300 dark:border-slate-700'
                    >
                      Hủy bỏ
                    </Button>

                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleSaveDraftMode1}
                      disabled={isSavingDraft || isSubmitting || mode1Rows.length === 0}
                      className='text-xs font-semibold h-8 border-slate-300 dark:border-slate-700'
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
                            deliveryAddress: r.deliveryAddress,
                            province: r.province || undefined,
                            createdAt: new Date()
                          });
                          setIsLabelModalOpen(true);
                        }
                      }}
                      className='text-xs font-semibold h-8 border-slate-300 dark:border-slate-700'
                    >
                      Xem trước
                    </Button>

                    <Button
                      onClick={handleSubmitMode1}
                      disabled={isSubmitting || mode1Rows.length === 0}
                      className='bg-[#0F3D62] hover:bg-[#0c314f] text-white px-3 font-bold shadow-md h-8 text-xs'
                    >
                      {isSubmitting ? (
                        <>
                          <IconLoader2 className='mr-2 h-4 w-4 animate-spin' /> Đang lưu dữ liệu...
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className='mr-1.5 h-4 w-4 text-emerald-400' /> Xác nhận
                          nhập kho
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
            onBackToBoard={() => {
              resetMode1Form();
              setActiveView('BOARD');
            }}
            onSwitchToCustomerMode={() => {
              resetMode1Form();
              setActiveView('MODE1_CUSTOMER');
            }}
            onSuccess={() => {
              resetMode1Form();
              setActiveView('BOARD');
              fetchInboundTrips();
              fetchKpi();
            }}
            onOpenReceipt={(receiptData) => {
              setSelectedReceiptData(receiptData);
              setIsInboundReceiptModalOpen(true);
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

        {/* ── Modal Chi Tiết Chuyến Xe Nhập Kho (Chế độ Xem & In Tem Nhận Diện) ── */}
        <WarehouseTripDetailModal
          isOpen={isTripViewModalOpen}
          onClose={() => {
            setIsTripViewModalOpen(false);
            setSelectedTripGroup(null);
          }}
          tripGroup={selectedTripGroup}
          readOnly={true}
          mode='INBOUND'
          onSuccess={() => {
            fetchInboundTrips();
            fetchKpi();
          }}
          onOpenReceipt={handleOpenReceiptForVehicle}
        />

        {/* ── Modal Tác Nghiệp & Kiểm Đếm Chuyến Xe Nhập Kho (Chế độ Chỉnh Sửa) ── */}
        <WarehouseTripDetailModal
          isOpen={isTripEditModalOpen}
          onClose={() => {
            setIsTripEditModalOpen(false);
            setSelectedTripGroup(null);
          }}
          tripGroup={selectedTripGroup}
          readOnly={false}
          mode='INBOUND'
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
