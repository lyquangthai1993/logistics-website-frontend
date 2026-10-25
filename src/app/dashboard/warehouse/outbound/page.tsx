'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  IconPrinter,
  IconCircleCheck,
  IconX,
  IconLoader2,
  IconFileSpreadsheet,
  IconCalendar,
  IconUser,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconRotate,
  IconChevronRight
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { rollbackTrip, tripManifestKeys } from '@/features/warehouse/api/trip-manifest';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import {
  WarehouseEditableGrid,
  WarehouseRowItem
} from '@/features/warehouse/components/warehouse-editable-grid';
import { WarehouseOutboundTransferFlow } from '@/features/warehouse/components/warehouse-outbound-transfer-flow';
import {
  WarehouseOutboundReceiptModal,
  OutboundReceiptData,
  OutboundReceiptItem
} from '@/features/warehouse/components/warehouse-outbound-receipt-modal';
import {
  WarehouseTripDetailModal,
  type InboundVehicleGroup,
  WarehouseWaybillDetailModal
} from '@/features/warehouse/components';
import type { WaybillDetailData } from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { resolveHubOption } from '@/features/warehouse/components/destination-hub-info-card';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { TripStopStatusBadge } from '@/features/warehouse/components/trip-stop-status-badge';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';
import { formatWeight, formatVolume } from '@/lib/format';
import {
  availableOutboundStock,
  proportionalMetric
} from '@/features/warehouse/lib/outbound-stock';

export default function WarehouseOutboundPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Active View: 'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>(
    'BOARD'
  );

  // Board Filter & Data
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
  // Processing status at this hub: PENDING = Chờ xử lý (nháp), COMPLETED = Đã xử lý (đã xuất)
  const [boardStatus, setBoardStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [tripGroups, setTripGroups] = useState<any[]>([]);
  // SD code of the draft trip currently opened on the note (null = new note)
  const [draftTripCode, setDraftTripCode] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [cancellingDraftCode, setCancellingDraftCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Outbound Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<OutboundReceiptData | null>(null);

  // Waybill Detail Modal State (Read-only audit view)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWaybillForDetail, setSelectedWaybillForDetail] =
    useState<WaybillDetailData | null>(null);

  // Vehicle Trip Detail Modal State (Read-only audit view: "khi click vào TRIP cũng sẽ tương tự như chỉ là dạng view thôi")
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTripGroup, setSelectedTripGroup] = useState<InboundVehicleGroup | null>(null);

  const isAdmin =
    user?.role === 'SUPER_ADMIN' ||
    (user?.role as any)?.id === 1 ||
    (user?.role as any)?.name === 'SUPER_ADMIN';

  const handleRollbackTrip = async (grp: InboundVehicleGroup) => {
    if (!grp?.tripCode || grp.tripCode === '—') return;
    if (
      !window.confirm(
        `Xác nhận mở lại chuyến xe ${grp.tripCode}? Toàn bộ số lượng tồn kho đã xuất sẽ được hoàn tác về kho và các đơn hàng sẽ quay lại trạng thái Chờ xử lý.`
      )
    ) {
      return;
    }
    try {
      const activeHubId = Number(user?.hubId ?? (user?.hub as any)?.id) || undefined;
      await rollbackTrip(grp.tripCode, {
        hubId: activeHubId,
        reason: 'Admin mở lại chuyến xe xuất kho từ bảng danh sách'
      });
      toast.success(`Đã mở lại chuyến xe ${grp.tripCode} về trạng thái Chờ xử lý!`);
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi mở lại chuyến xe');
    }
  };

  const handleOpenTripDetail = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripDetailModalOpen(true);
  };

  // Date Range Filter: Default from 1st of current month to today (supports URL params)
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

  // Trip tab counters — returned by the same query that renders the board rows (1:1 parity)
  const [tripCounts, setTripCounts] = useState({
    allCount: 0,
    pendingCount: 0,
    completedCount: 0
  });

  // Customer Mode 1 Form Fields
  const [outboundLicensePlate, setOutboundLicensePlate] = useState('');
  const [outboundDriverName, setOutboundDriverName] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
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
      notes: ''
    }
  ]);

  const hasDraftOrdersInNote = useMemo(() => {
    return mode1Rows.some((r) => {
      const st = (r.hubStatus ?? r.status ?? '').toUpperCase();
      return ['DRAFT', 'PENDING', 'WAITING'].includes(st);
    });
  }, [mode1Rows]);

  // Transfer Mode 2 Stepper State
  const [transferHubId, setTransferHubId] = useState<string>('2');
  const [transferLicensePlate, setTransferLicensePlate] = useState('');
  const [transferDriverName, setTransferDriverName] = useState('');
  const [level1Hubs, setLevel1Hubs] = useState<any[]>([]);
  const [level2XeBoHubs, setLevel2XeBoHubs] = useState<any[]>([]);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? useAuthStore.getState()?.accessToken ||
          localStorage.getItem('access_token') ||
          document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]
        : null;

    fetch('/api/v1/hubs/active', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data) && data.length > 0) {
          setLevel1Hubs(
            data.filter(
              (h: any) =>
                h.level === 1 && !h.code?.startsWith('HUB-BO-') && !h.code?.startsWith('XB-')
            )
          );
          setLevel2XeBoHubs(
            data.filter(
              (h: any) =>
                h.level === 2 || h.code?.startsWith('HUB-BO-') || h.code?.startsWith('XB-')
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  const [mode2Rows, setMode2Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '',
      pickupAddress: '',
      goodsDescription: '',
      totalQuantity: 1,
      totalWeight: 0,
      totalVolume: 0,
      deliveryMode: 'HUB_L1',
      deliveryAddress: '',
      notes: ''
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Board Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });

  // Đồng bộ ngày từ URL searchParams nếu có
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

  // Reset page to 1 when search, tab, or applied dates change
  useEffect(() => {
    setPage(1);
  }, [appliedSearch, boardStatus, appliedFromDate, appliedToDate]);

  // Fetch Board Trips (one row per SD trip of this hub: drafts + dispatched) + tab counters (same query)
  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(appliedSearch.trim() ? { search: appliedSearch.trim() } : {}),
      ...(boardStatus !== 'ALL' ? { status: boardStatus } : {}),
      ...(appliedFromDate ? { fromDate: appliedFromDate } : {}),
      ...(appliedToDate ? { toDate: appliedToDate } : {})
    });

    fetch(`/api/v1/warehouse/outbound-trips?${query.toString()}`, {
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
        // Accept both raw `{ data, meta }` and wrapped `{ data: { data, meta } }` payloads
        const payload = resData?.meta ? resData : (resData?.data ?? resData);
        setTripGroups(Array.isArray(payload?.data) ? payload.data : []);
        const m = payload?.meta;
        setMeta({
          total: m?.total ?? 0,
          page: m?.page ?? 1,
          limit: m?.limit ?? pageSize,
          totalPages: m?.totalPages ?? 1
        });
        setTripCounts({
          allCount: m?.allCount ?? 0,
          pendingCount: m?.pendingCount ?? 0,
          completedCount: m?.completedCount ?? 0
        });
      })
      .catch((err) => {
        setTripGroups([]);
        showApiErrorToast(err, 'Không thể tải danh sách chuyến xe xuất kho');
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, appliedSearch, boardStatus, appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchOrders();
    }
  }, [activeView, fetchOrders]);

  // Refresh Metrics Button Action — re-reads hub stock of the rows on the note
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = tokenManager.getAccessToken();

    try {
      const isNoteView = activeView === 'MODE1_CUSTOMER' || activeView === 'MODE2_TRANSFER';
      const activeRows = activeView === 'MODE1_CUSTOMER' ? mode1Rows : mode2Rows;
      const orderIds = activeRows.map((r) => Number(r.id)).filter((id) => !isNaN(id) && id > 0);

      if (isNoteView && orderIds.length > 0) {
        const query = new URLSearchParams({
          ids: Array.from(new Set(orderIds)).join(','),
          flow: 'OUTBOUND_LOOKUP',
          limit: '100'
        });
        const res = await fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: res.statusText }));
          throw { response: { data: errData, status: res.status } };
        }

        // NestJS ResponseTransformInterceptor wraps payloads: { statusCode, message, data: { data, meta } }
        const json = await res.json();
        const payload = json?.meta ? json : (json?.data ?? json);
        const freshData: any[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        const freshById = new Map(freshData.map((f) => [Number(f.id), f]));
        const freshByCode = new Map(
          freshData
            .filter((f) => f.orderCode)
            .map((f) => [String(f.orderCode).trim().toUpperCase(), f])
        );

        const applyFresh = (rows: WarehouseRowItem[]) =>
          rows.map((r) => {
            const fresh =
              freshById.get(Number(r.id)) ||
              (r.orderCode ? freshByCode.get(r.orderCode.trim().toUpperCase()) : undefined);
            if (!fresh) return r;
            const stock = availableOutboundStock(fresh);
            const currentQty = Number(r.totalQuantity) || 0;
            const exceeds = currentQty > stock;
            const qty = exceeds ? stock : currentQty;
            return {
              ...r,
              goodsDescription: fresh.goodsDescription ?? r.goodsDescription,
              remainingQuantity: stock,
              ...(exceeds
                ? {
                    totalQuantity: qty,
                    quantityToExport: qty,
                    totalWeight: proportionalMetric(fresh.totalWeight, qty, fresh.totalQuantity),
                    totalVolume: proportionalMetric(fresh.totalVolume, qty, fresh.totalQuantity)
                  }
                : {})
            };
          });

        if (activeView === 'MODE1_CUSTOMER') {
          setMode1Rows((prev) => applyFresh(prev));
        } else {
          setMode2Rows((prev) => applyFresh(prev));
        }
        toast.success('Đã cập nhật lại tồn kho khả dụng của các dòng hàng!');
      } else {
        fetchOrders();
        toast.success('Đã cập nhật lại thông số danh sách xuất kho!');
      }
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể cập nhật thông số lúc này');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resolveRowOutboundDestination = (r: WarehouseRowItem): string => {
    const isRowTransfer =
      r.deliveryMode === 'HUB_L1' ||
      r.deliveryMode === 'XE_BO' ||
      (r.destinationHubId !== undefined &&
        r.destinationHubId !== null &&
        Number(r.destinationHubId) > 0);

    if (isRowTransfer) {
      const { hub } = resolveHubOption(
        typeof r.destinationHub === 'object' ? r.destinationHub : null,
        r.destinationHubId,
        r.deliveryAddress !== r.originalDeliveryAddress ? r.deliveryAddress : null,
        level1Hubs,
        level2XeBoHubs,
        r.deliveryMode
      );
      if (hub?.name) {
        return hub.address && !hub.name.includes(hub.address)
          ? `${hub.name} — ${hub.address}`
          : hub.name;
      }
    }

    return (r.deliveryAddress || customerAddress || '').trim();
  };

  // Validate the note and build the request body shared by "Xác nhận xuất kho" and "Lưu nháp"
  const buildOutboundRequest = async (mode: 'CUSTOMER' | 'TRANSFER') => {
    if (mode === 'CUSTOMER') {
      if (!outboundLicensePlate.trim()) {
        toast.error('Vui lòng nhập Biển số xe xuất kho (bắt buộc)');
        return null;
      }
    } else if (mode === 'TRANSFER') {
      if (!transferLicensePlate.trim()) {
        toast.error('Vui lòng nhập Biển số xe luân chuyển (bắt buộc)');
        return null;
      }
    }

    const activeRows = mode === 'CUSTOMER' ? mode1Rows : mode2Rows;
    const rawValidRows = activeRows.filter(
      (r) => r.orderCode && r.orderCode.trim() !== '' && !r.orderCode.startsWith('(Tự sinh')
    );

    if (rawValidRows.length === 0) {
      toast.error('Vui lòng nhập hoặc chọn ít nhất một đơn hàng cần xuất kho');
      return null;
    }

    // Auto-resolve any row that has orderCode but has not yet linked an order id (e.g. fast click or Excel paste)
    const token = tokenManager.getAccessToken();
    const validRows: WarehouseRowItem[] = [];
    for (const rowItem of rawValidRows) {
      if (rowItem.id && !isNaN(Number(rowItem.id))) {
        validRows.push(rowItem);
        continue;
      }
      const code = rowItem.orderCode.trim().toUpperCase();
      try {
        const q = new URLSearchParams({
          page: '1',
          limit: '20',
          search: code,
          flow: 'OUTBOUND_LOOKUP'
        });
        const resLookup = await fetch(`/api/v1/warehouse/orders?${q.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (resLookup.ok) {
          const json = await resLookup.json().catch(() => null);
          const payload = json?.meta ? json : (json?.data ?? json);
          const list: any[] = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
          const found = list.find((it) => it.orderCode?.trim().toUpperCase() === code);
          if (found) {
            const availStock = availableOutboundStock(found);
            const reqQty = Number(rowItem.totalQuantity) || availStock;
            validRows.push({
              ...rowItem,
              id: found.id,
              orderCode: found.orderCode,
              goodsDescription: found.goodsDescription || rowItem.goodsDescription || '',
              remainingQuantity: availStock,
              totalQuantity: reqQty,
              quantityToExport: reqQty,
              totalWeight: proportionalMetric(found.totalWeight, reqQty, found.totalQuantity),
              totalVolume: proportionalMetric(found.totalVolume, reqQty, found.totalQuantity),
              deliveryAddress:
                rowItem.deliveryAddress || found.destinationHub || found.deliveryAddress || ''
            });
            continue;
          }
        }
      } catch {
        // fall through to missing id error below
      }
      toast.error(`Không tìm thấy đơn hàng "${code}" trong tồn kho khả dụng để xuất kho!`);
      return null;
    }

    // Partial stock validation
    for (const r of validRows) {
      const exportQty = Number(r.totalQuantity) || 0;
      if (exportQty <= 0) {
        toast.error(`Đơn ${r.orderCode}: Số lượng xuất phải lớn hơn 0`);
        return null;
      }
      if (r.remainingQuantity !== undefined && r.remainingQuantity !== null) {
        if (exportQty > r.remainingQuantity) {
          toast.error(
            `Đơn ${r.orderCode}: Số lượng xuất (${exportQty}) vượt quá tồn kho hiện tại (${r.remainingQuantity} kiện)!`
          );
          return null;
        }
      }
    }

    const seenIds = new Map<string, number>();
    const seenCodes = new Map<string, number>();
    for (let i = 0; i < validRows.length; i++) {
      const rid = validRows[i].id;
      const rcode = validRows[i].orderCode?.trim().toUpperCase();
      if (rid !== undefined && rid !== null && rid !== '') {
        const key = String(rid);
        if (seenIds.has(key)) {
          toast.error(
            `Dòng hàng ${validRows[i].orderCode} đang bị chọn 2 lần trên phiếu. Vui lòng gộp số lượng vào một dòng.`
          );
          return null;
        }
        seenIds.set(key, i);
      }
      if (rcode) {
        if (seenCodes.has(rcode)) {
          toast.error(
            `Dòng hàng ${validRows[i].orderCode} đang bị chọn 2 lần trên phiếu. Vui lòng gộp số lượng vào một dòng.`
          );
          return null;
        }
        seenCodes.set(rcode, i);
      }
    }

    const orderIds = validRows.map((r) => Number(r.id)).filter((id) => !isNaN(id) && id > 0);

    // Auto-detect transfer mode if any item has destinationHubId specified
    const hasTransferItem = validRows.some(
      (r) =>
        r.deliveryMode !== 'DIRECT_CUSTOMER' &&
        r.destinationHubId &&
        (!user?.hub?.id || Number(r.destinationHubId) !== Number(user.hub.id))
    );
    const effectiveMode: 'CUSTOMER' | 'TRANSFER' =
      mode === 'TRANSFER' || hasTransferItem ? 'TRANSFER' : 'CUSTOMER';

    const transferRows = validRows.filter(
      (r) =>
        r.deliveryMode !== 'DIRECT_CUSTOMER' &&
        r.destinationHubId &&
        (!user?.hub?.id || Number(r.destinationHubId) !== Number(user.hub.id))
    );
    const primaryDestHubId =
      mode === 'TRANSFER'
        ? parseInt(transferHubId, 10)
        : transferRows.length === validRows.length && transferRows.length > 0
          ? Number(transferRows[0].destinationHubId)
          : undefined;

    const items = validRows
      .filter((r) => r.id && !isNaN(Number(r.id)))
      .map((r) => {
        const isDirect = r.deliveryMode === 'DIRECT_CUSTOMER';
        const resolvedAddr = resolveRowOutboundDestination(r);
        return {
          orderId: Number(r.id),
          quantityToExport: Number(r.totalQuantity) || 0,
          weightToExport: Number(r.totalWeight) || 0,
          volumeToExport: Number(r.totalVolume) || 0,
          destinationHubId: isDirect
            ? undefined
            : r.destinationHubId
              ? Number(r.destinationHubId)
              : undefined,
          deliveryMode: r.deliveryMode || (r.destinationHubId ? 'HUB_L1' : 'DIRECT_CUSTOMER'),
          deliveryAddress: resolvedAddr || undefined,
          province: r.province?.trim() || undefined,
          accompanyingDocs: r.accompanyingDocs?.trim() || undefined,
          notes: r.notes?.trim() || undefined,
          goodsDescription: r.goodsDescription?.trim() || undefined,
          pickupAddress: r.pickupAddress?.trim() || undefined
        };
      });

    const body = {
      orderIds: orderIds.length > 0 ? orderIds : undefined,
      items: items.length > 0 ? items : undefined,
      mode: effectiveMode,
      customerName: effectiveMode === 'CUSTOMER' ? customerName : undefined,
      customerPhone: effectiveMode === 'CUSTOMER' ? customerPhone : undefined,
      deliveryAddress: effectiveMode === 'CUSTOMER' ? customerAddress : undefined,
      destinationHubId: primaryDestHubId,
      licensePlate: mode === 'TRANSFER' ? transferLicensePlate : outboundLicensePlate,
      driverName: mode === 'TRANSFER' ? transferDriverName : outboundDriverName,
      dispatchDate: dispatchDate || undefined,
      draftTripCode: draftTripCode || undefined
    };

    return { body, validRows, effectiveMode, primaryDestHubId, resolveRowOutboundDestination };
  };

  // Submit Outbound
  const handleSubmitOutbound = async (mode: 'CUSTOMER' | 'TRANSFER') => {
    if (hasDraftOrdersInNote) {
      toast.error(
        "Chuyến xe đang chứa đơn hàng nháp. Chuyến xe có đơn nháp chỉ được phép ở trạng thái 'Chờ xử lý'. Vui lòng chọn 'Lưu nháp' chuyến xe hoặc duyệt đơn hàng trước khi xuất kho."
      );
      return;
    }
    const request = await buildOutboundRequest(mode);
    if (!request) return;
    const { body, validRows, effectiveMode, primaryDestHubId, resolveRowOutboundDestination } =
      request;

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const res = await fetch('/api/v1/warehouse/outbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      // Backend wraps the payload: { data: { invoiceCode, tripCode, orders, ... } }
      const json = await res.json().catch(() => ({}));
      const payload = json?.data ?? json;

      toast.success(
        effectiveMode === 'CUSTOMER'
          ? 'Đã xác nhận xuất kho thành công!'
          : 'Đã lập phiếu xuất luân chuyển và sẵn sàng in Loading Plan!'
      );

      const isTransferReceipt = effectiveMode === 'TRANSFER';
      const allActiveHubs = [...level1Hubs, ...level2XeBoHubs];
      const matchedPrimaryHub = isTransferReceipt
        ? allActiveHubs.find((h: any) => String(h.id) === String(primaryDestHubId))
        : undefined;
      const transferHubName = matchedPrimaryHub?.name
        ? matchedPrimaryHub.address && !matchedPrimaryHub.name.includes(matchedPrimaryHub.address)
          ? `${matchedPrimaryHub.name} — ${matchedPrimaryHub.address}`
          : matchedPrimaryHub.name
        : undefined;
      const totalExportQty = validRows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0);

      // Open Outbound Receipt Modal for printing — one receipt line per grid row
      // (rows sharing the same order code are distinct cargo lines and must stay separate).
      setSelectedReceiptData({
        orderCode: payload?.invoiceCode || validRows[0]?.orderCode || '',
        tripCode: payload?.tripCode || undefined,
        goodsDescription: validRows
          .map((r) => r.goodsDescription)
          .filter(Boolean)
          .join(', '),
        totalQuantity: totalExportQty,
        outboundQuantity: totalExportQty,
        totalWeight: validRows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0),
        totalVolume: validRows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0),
        // Same plate/driver source as the confirm request above
        driverName: mode === 'TRANSFER' ? transferDriverName : outboundDriverName,
        licensePlate: mode === 'TRANSFER' ? transferLicensePlate : outboundLicensePlate,
        deliveryAddress: isTransferReceipt ? undefined : customerAddress,
        destinationHub: transferHubName,
        originHub: user?.hub?.name || '',
        mode: effectiveMode,
        dispatchDate: dispatchDate,
        notes: validRows
          .map((r) => r.notes)
          .filter(Boolean)
          .join('; '),
        items: validRows.map((r) => {
          const itemDest = resolveRowOutboundDestination(r);
          return {
            orderCode: r.orderCode,
            goodsDescription: r.goodsDescription || '',
            quantity: Number(r.totalQuantity) || 0,
            unit: 'Kiện',
            destinationHub: itemDest,
            deliveryAddress: itemDest,
            province: r.province || '',
            accompanyingDocs: r.accompanyingDocs || '',
            notes: r.notes || ''
          };
        })
      });
      setIsReceiptModalOpen(true);

      resetMode1Form();
      setActiveView('BOARD');
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emptyMode1Row = (): WarehouseRowItem => ({
    orderCode: '',
    pickupAddress: '',
    goodsDescription: '',
    totalQuantity: 1,
    totalWeight: 0,
    totalVolume: 0,
    deliveryMode: 'DIRECT_CUSTOMER',
    deliveryAddress: '',
    notes: ''
  });

  // Fresh customer note (no draft attached)
  const resetMode1Form = () => {
    setDraftTripCode(null);
    setOutboundLicensePlate('');
    setOutboundDriverName('');
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setMode1Rows([emptyMode1Row()]);
  };

  // "Tạo phiếu xuất": luôn làm sạch dữ liệu cũ để bắt đầu phiếu xuất mới
  const handleOpenNewMode1 = () => {
    resetMode1Form();
    setActiveView('MODE1_CUSTOMER');
  };

  // "Lưu nháp": persists the note as a draft trip (Chờ xử lý) — allocates SD code, no stock deduction
  const handleSaveDraftMode1 = async () => {
    const request = await buildOutboundRequest('CUSTOMER');
    if (!request) return;

    setIsSavingDraft(true);
    const token = tokenManager.getAccessToken();
    try {
      const res = await fetch('/api/v1/warehouse/outbound/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(request.body)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }
      const json = await res.json().catch(() => ({}));
      const payload = json?.data ?? json;
      toast.success(
        payload?.tripCode
          ? `Đã lưu nháp chuyến ${payload.tripCode} (Chờ xử lý)`
          : 'Đã lưu nháp phiếu xuất kho'
      );
      resetMode1Form();
      // Switching back to BOARD and explicitly refreshing orders + manifest cache
      // (needed even when boardStatus was already 'PENDING')
      setBoardStatus('PENDING');
      setActiveView('BOARD');
      fetchOrders();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tripManifestKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['warehouse', 'outbound-trips'] })
      ]);
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể lưu nháp phiếu xuất kho');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // "Tiếp tục": reopen a draft trip on the outbound note to edit or confirm it
  const handleResumeDraft = (grp: InboundVehicleGroup) => {
    const allActiveHubs = [...level1Hubs, ...level2XeBoHubs];
    const rows: WarehouseRowItem[] = grp.orders.map((o: any) => {
      const plannedDest =
        o.plannedDestinationHubId !== undefined && o.plannedDestinationHubId !== null
          ? Number(o.plannedDestinationHubId)
          : o.outboundDestinationHubEntity?.id
            ? Number(o.outboundDestinationHubEntity.id)
            : null;
      const targetHubEntity =
        o.outboundDestinationHubEntity ||
        (plannedDest
          ? allActiveHubs.find((h: any) => Number(h.id) === Number(plannedDest))
          : null) ||
        (plannedDest && o.destinationHubEntity?.id === plannedDest ? o.destinationHubEntity : null);
      const isXeBo =
        targetHubEntity?.level === 2 ||
        targetHubEntity?.code?.startsWith('XB-') ||
        targetHubEntity?.code?.startsWith('HUB-BO-') ||
        targetHubEntity?.name?.toLowerCase().includes('xe bo') ||
        (o.outboundDestination && o.outboundDestination.toLowerCase().includes('xe bo')) ||
        o.deliveryMode === 'XE_BO';
      const resolvedDeliveryMode: 'DIRECT_CUSTOMER' | 'HUB_L1' | 'XE_BO' = isXeBo
        ? 'XE_BO'
        : plannedDest
          ? 'HUB_L1'
          : o.deliveryMode || 'DIRECT_CUSTOMER';

      const targetHubLabel = targetHubEntity?.name
        ? targetHubEntity.address && !targetHubEntity.name.includes(targetHubEntity.address)
          ? `${targetHubEntity.name} — ${targetHubEntity.address}`
          : targetHubEntity.name
        : '';
      const resolvedOutboundAddress =
        resolvedDeliveryMode !== 'DIRECT_CUSTOMER'
          ? targetHubLabel || o.outboundDestination || o.deliveryAddress || o.destinationHub || ''
          : o.outboundDestination || o.deliveryAddress || o.destinationHub || '';

      const draftQty = Number(o.exportedQuantity) || 0;
      const liveStock = availableOutboundStock(o);
      // Khi mở lại chuyến xe nháp để tiếp tục xuất, số tồn khả dụng cho dòng hàng này
      // phải bao gồm cả số kiện mà chính chuyến nháp này đang dự kiến xuất (tránh báo "Vượt tồn!")
      const effectiveAvailable = liveStock >= draftQty ? liveStock : liveStock + draftQty;

      return {
        id: o.id,
        orderCode: o.orderCode,
        pickupAddress: o.pickupAddress || '',
        goodsDescription: o.goodsDescription || '',
        totalQuantity: draftQty,
        quantityToExport: draftQty,
        remainingQuantity: effectiveAvailable,
        totalWeight: Number(o.exportedWeight) || 0,
        totalVolume: Number(o.exportedVolume) || 0,
        deliveryMode: resolvedDeliveryMode,
        deliveryAddress: resolvedOutboundAddress,
        originalDeliveryAddress:
          o.originalDeliveryAddress || o.deliveryAddress || o.destinationHub || '',
        destinationHubId: plannedDest,
        destinationHub:
          resolvedDeliveryMode !== 'DIRECT_CUSTOMER'
            ? targetHubEntity || o.outboundDestination || null
            : null,
        province: o.province || '',
        accompanyingDocs: o.accompanyingDocs || '',
        notes: o.notes || '',
        status: o.hubStatus ?? o.status
      };
    });

    setDraftTripCode(grp.tripCode);
    setOutboundLicensePlate(grp.licensePlate === 'XE XUẤT KHO' ? '' : grp.licensePlate);
    setOutboundDriverName(grp.driverName || '');
    setDispatchDate(grp.receiveDate || new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setMode1Rows(rows.length > 0 ? rows : [emptyMode1Row()]);
    setActiveView('MODE1_CUSTOMER');
  };

  // "Hủy nháp": drops the draft trip (no stock was deducted, nothing to roll back)
  const handleCancelDraft = async (tripCode: string) => {
    if (
      !window.confirm(
        `Hủy chuyến nháp ${tripCode}? Các dòng hàng dự kiến xuất sẽ bị xóa khỏi chuyến.`
      )
    ) {
      return;
    }
    setCancellingDraftCode(tripCode);
    const token = tokenManager.getAccessToken();
    try {
      const res = await fetch(`/api/v1/warehouse/outbound/drafts/${encodeURIComponent(tripCode)}`, {
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
      if (draftTripCode === tripCode) setDraftTripCode(null);
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể hủy chuyến nháp');
    } finally {
      setCancellingDraftCode(null);
    }
  };

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

  // Trip rows come pre-grouped from the backend (one row per SD trip dispatched from this hub)
  const vehicleGroups: InboundVehicleGroup[] = useMemo(
    () =>
      tripGroups.map((g) => {
        const descs = Array.from(
          new Set((g.orders ?? []).map((x: any) => x.goodsDescription).filter(Boolean))
        ) as string[];
        const rawDate =
          g.dispatchDate ||
          g.dispatchedAt ||
          g.receiveDate ||
          g.createdAt ||
          g.orders?.[0]?.createdAt;
        return {
          groupKey: g.tripCode,
          licensePlate: g.licensePlate?.trim()?.toUpperCase() || 'XE XUẤT KHO',
          driverName: g.driverName?.trim() || '',
          tripCode: g.tripCode,
          receiveDate: rawDate ? String(rawDate).split('T')[0] : undefined,
          // Status of the trip at this hub: origin stop is "Đã xử lý" once dispatched
          status: g.status ?? 'COMPLETED',
          isTransfer: !!g.isTransfer,
          orders: g.orders ?? [],
          totalQuantity: Number(g.totalQuantity) || 0,
          totalWeight: Number(g.totalWeight) || 0,
          totalVolume: Number(g.totalVolume) || 0,
          goodsDescription:
            descs.length === 0
              ? 'Hàng hóa tổng quan'
              : descs.length === 1
                ? descs[0]
                : `${descs[0]} (+${descs.length - 1} loại hàng)`,
          notes: g.notes || '',
          hubId: g.hubId ? Number(g.hubId) : undefined
        };
      }),
    [tripGroups]
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
    // "Xuất tại kho" = the hub that dispatched this vehicle (hub of creator / dispatch transaction).
    const allActiveHubs = [...level1Hubs, ...level2XeBoHubs];
    const firstOrder = grp.orders[0];
    const dispatchTx = firstOrder?.inventoryTransactions?.find(
      (tx: any) =>
        (tx?.type === 'OUTBOUND' || tx?.type === 'TRANSFER') &&
        (grp.tripCode === '—' || !tx?.tripCode || tx.tripCode === grp.tripCode)
    );
    const tripRecord = firstOrder?.trips?.find(
      (t: any) => grp.tripCode !== '—' && t?.tripCode === grp.tripCode
    );
    const knownHubs = [
      dispatchTx?.hub,
      tripRecord?.originHub,
      firstOrder?.originHubEntity,
      firstOrder?.currentHubEntity,
      firstOrder?.destinationHubEntity,
      ...allActiveHubs
    ];
    const orig =
      dispatchTx?.hub?.name ||
      knownHubs.find(
        (h: any) => h?.id && dispatchTx?.hubId && Number(h.id) === Number(dispatchTx.hubId)
      )?.name ||
      tripRecord?.originHub?.name ||
      firstOrder?.originHubEntity?.name ||
      user?.hub?.name ||
      '';
    const dest =
      firstOrder?.outboundDestination ||
      firstOrder?.outboundDestinationHubEntity?.name ||
      tripRecord?.destinationHub?.name ||
      dispatchTx?.destination ||
      firstOrder?.deliveryAddress?.trim() ||
      firstOrder?.destinationHubEntity?.name ||
      firstOrder?.destinationHub ||
      '';

    const items: OutboundReceiptItem[] = grp.orders.map((o: any) => {
      const tripTx = o.inventoryTransactions?.find(
        (tx: any) =>
          (tx?.type === 'OUTBOUND' || tx?.type === 'TRANSFER') &&
          (grp.tripCode === '—' || !tx?.tripCode || tx.tripCode === grp.tripCode)
      );
      const tripForOrder = (o.trips ?? []).find(
        (t: any) => grp.tripCode !== '—' && t?.tripCode === grp.tripCode
      );
      const exportedQty =
        o.exportedQuantity != null
          ? Number(o.exportedQuantity)
          : tripTx
            ? Number(tripTx.quantity || 0)
            : Number(o.outboundQuantity || o.totalQuantity || 1);
      const plannedHubId = o.plannedDestinationHubId ?? tripForOrder?.destinationHubId ?? null;
      const outboundHubEntity =
        o.outboundDestinationHubEntity ||
        tripForOrder?.destinationHub ||
        (plannedHubId
          ? allActiveHubs.find((h: any) => Number(h.id) === Number(plannedHubId))
          : null);
      const outboundHubLabel = outboundHubEntity?.name
        ? outboundHubEntity.address && !outboundHubEntity.name.includes(outboundHubEntity.address)
          ? `${outboundHubEntity.name} — ${outboundHubEntity.address}`
          : outboundHubEntity.name
        : null;
      const itemDestination =
        outboundHubLabel ||
        o.outboundDestination ||
        tripTx?.destination ||
        o.deliveryAddress ||
        o.destinationHub ||
        dest;
      return {
        orderCode: o.orderCode,
        goodsDescription: o.goodsDescription || 'Hàng hóa xuất kho',
        quantity: exportedQty,
        unit: 'Kiện',
        destinationHub: itemDestination,
        deliveryAddress: itemDestination,
        province: outboundHubEntity?.city || o.province || o.destinationHubEntity?.province || '—',
        accompanyingDocs: o.accompanyingDocs || '—',
        notes: o.notes || ''
      };
    });

    const receiptData: OutboundReceiptData = {
      tripCode: grp.tripCode !== '—' ? grp.tripCode : undefined,
      orderCode:
        dispatchTx?.invoiceCode ||
        (grp.tripCode !== '—'
          ? grp.tripCode
          : grp.orders.length > 1
            ? `CHUYẾN-${grp.licensePlate}`
            : grp.orders[0]?.orderCode || 'WH-OUT'),
      goodsDescription: grp.goodsDescription,
      totalQuantity: grp.totalQuantity,
      outboundQuantity: grp.totalQuantity,
      totalWeight: grp.totalWeight,
      totalVolume: grp.totalVolume,
      driverName: grp.driverName,
      licensePlate: grp.licensePlate,
      deliveryAddress: items[0]?.deliveryAddress || dest,
      destinationHub: items[0]?.destinationHub || dest,
      originHub: orig,
      mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
      dispatchDate: grp.receiveDate || new Date().toISOString().split('T')[0],
      notes: grp.notes || '',
      items
    };
    setSelectedReceiptData(receiptData);
    setIsReceiptModalOpen(true);
  };

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className='space-y-2 flex-1 w-full min-w-0'>
        {/* ── Page Header (Board & Mode 1 Customer) ── */}
        {activeView !== 'MODE2_TRANSFER' && (
          <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
            <div>
              <div className='flex flex-wrap items-center gap-2.5'>
                <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
                  <IconTruck className='h-6 w-6 shrink-0' />
                  <span>Xuất kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
                </h1>
                {activeView === 'BOARD' && (
                  <Button
                    onClick={handleOpenNewMode1}
                    className='hidden md:inline-flex bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold shadow-sm h-8 px-2.5'
                  >
                    <IconPlus className='mr-1 h-4 w-4' /> Xuất kho
                  </Button>
                )}
              </div>
              <p className='text-xs text-slate-500 mt-0.5'>
                Lập kế hoạch xuất hàng cho khách hoặc điều chuyển sang Hub khác / Tuyến xe bo.
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
        )}

        {/* ── View 1: Main Outbound Board (Stat Cards removed per feedback_17_8) ── */}
        {activeView === 'BOARD' && (
          <div className='space-y-1.5'>
            {/* Toolbar with Search, Date Range Filter, Status Tabs & Refresh Button */}
            <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
              <CardContent className='p-1 space-y-1.5'>
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                  {/* Search Box & Date Range Filter */}
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0'>
                    {/* Search Box */}
                    <div className='relative flex-1 min-w-0'>
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
                        placeholder='Tìm mã đơn, xe, tài xế, tên hàng...'
                        className='pl-9 pr-8 h-8.5 text-xs w-full'
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
                    <div className='flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-auto'>
                      <div className='flex items-center gap-1 w-full sm:w-auto'>
                        <div className='flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium shrink-0'>
                          <IconCalendar className='h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400' />
                          <span>Từ:</span>
                        </div>
                        <input
                          type='date'
                          aria-label='Từ ngày'
                          value={fromDate}
                          max={toDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className='flex-1 sm:flex-initial min-w-[100px] px-1 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                        />
                        <span className='text-slate-400 font-medium px-0.5 shrink-0'>đến:</span>
                        <input
                          type='date'
                          aria-label='Đến ngày'
                          value={toDate}
                          min={fromDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className='flex-1 sm:flex-initial min-w-[100px] px-1 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                        />
                      </div>
                      <div className='flex items-center gap-1 shrink-0 justify-end sm:justify-start w-full sm:w-auto'>
                        <Button
                          type='button'
                          size='sm'
                          onClick={handleApplyDateRange}
                          className='h-7 flex-1 sm:flex-initial px-2.5 text-xs font-semibold bg-[#0F3D62] hover:bg-[#0c2f4d] text-white shadow-xs cursor-pointer'
                          title='Áp dụng bộ lọc theo khoảng thời gian'
                        >
                          Áp dụng
                        </Button>
                        {(appliedFromDate !== getDefaultFromDate() ||
                          appliedToDate !== getDefaultToDate()) && (
                          <button
                            type='button'
                            onClick={handleResetDateRange}
                            className='text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 font-medium cursor-pointer shrink-0'
                            title='Đặt lại về tháng này'
                          >
                            Đặt lại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Processing Status Tabs & Refresh Button */}
                  <div className='flex items-center justify-between gap-1.5 w-full md:w-auto'>
                    <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto scrollbar-none flex-1 md:flex-initial'>
                      {[
                        { key: 'ALL', label: `Tất cả (${tripCounts.allCount ?? 0})` },
                        { key: 'PENDING', label: `Chờ xử lý (${tripCounts.pendingCount ?? 0})` },
                        { key: 'COMPLETED', label: `Đã xử lý (${tripCounts.completedCount ?? 0})` }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setBoardStatus(tab.key as typeof boardStatus)}
                          className={`px-2 sm:px-2.5 py-1 rounded-md transition-all whitespace-nowrap text-[11px] sm:text-xs ${
                            boardStatus === tab.key
                              ? 'bg-white text-[#0F3D62] shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                              : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Refresh Metrics Button (Icon only on mobile, text on desktop) */}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleRefreshMetrics}
                      disabled={isRefreshing}
                      className='h-8 w-8 sm:w-auto p-0 sm:px-2.5 text-xs font-bold border-slate-300 shrink-0 ml-auto md:ml-0'
                      title='Cập nhật lại thông số'
                    >
                      <IconRefresh
                        className={`h-4 w-4 text-blue-600 sm:mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                      <span className='hidden sm:inline'>Cập nhật</span>
                    </Button>
                  </div>
                </div>

                {/* Desktop Outbound Board Table (Frame sq2P6 parity với Inbound) */}
                <div className='hidden md:block border rounded-lg overflow-x-auto'>
                  <table className='w-full min-w-[900px] text-[11px] text-left'>
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
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className='p-2 text-center text-gray-500'>
                            <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                            Đang tải danh sách đơn xuất kho...
                          </td>
                        </tr>
                      ) : vehicleGroups.length === 0 ? (
                        <tr>
                          <td colSpan={7} className='p-2 text-center text-gray-400'>
                            Không có chuyến xe xuất kho phù hợp bộ lọc
                          </td>
                        </tr>
                      ) : (
                        vehicleGroups.map((grp) => {
                          // Trip status at this hub comes from the backend: COMPLETED = đã xuất, PENDING = nháp
                          const isDispatched = grp.status === 'COMPLETED';
                          const isDraft = grp.status === 'PENDING';
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
                                    title='Nhấp để xem chi tiết chuyến xe (chế độ xem)'
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
                                <TripStopStatusBadge
                                  status={isDispatched ? 'COMPLETED' : 'PENDING'}
                                />
                              </td>
                              <td className='py-1 px-2 text-center'>
                                <div className='flex items-center justify-center gap-1.5 flex-wrap'>
                                  {isDraft ? (
                                    <>
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleResumeDraft(grp)}
                                        className='h-7 text-[11px] text-[#0F3D62] border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 px-2 font-semibold'
                                        title='Mở lại phiếu nháp để chỉnh sửa hoặc xác nhận xuất kho'
                                      >
                                        <IconPencil className='h-3.5 w-3.5 mr-1' /> Tiếp tục
                                      </Button>
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleCancelDraft(grp.tripCode)}
                                        disabled={cancellingDraftCode === grp.tripCode}
                                        className='h-7 text-[11px] text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 px-2 font-semibold'
                                        title='Hủy chuyến nháp (chưa trừ tồn kho)'
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
                                        title='In phiếu xuất xe (chứa tất cả đơn hàng của xe)'
                                      >
                                        <IconPrinter className='h-3.5 w-3.5 mr-1' /> In phiếu xuất
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

                {/* Mobile Outbound Trip Cards (Chế độ xem gọn cho thiết bị di động - xem thông tin chính, không chứa nút thao tác) */}
                <div className='block md:hidden space-y-2'>
                  {isLoading ? (
                    <div className='p-6 text-center text-gray-500 bg-white dark:bg-slate-900 border rounded-lg'>
                      <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                      <p className='text-xs'>Đang tải danh sách đơn xuất kho...</p>
                    </div>
                  ) : vehicleGroups.length === 0 ? (
                    <div className='p-6 text-center text-gray-400 bg-white dark:bg-slate-900 border rounded-lg'>
                      <IconTruck className='h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400' />
                      <p className='text-xs'>Không có chuyến xe xuất kho phù hợp bộ lọc</p>
                    </div>
                  ) : (
                    vehicleGroups.map((grp) => {
                      const isDispatched = grp.status === 'COMPLETED';
                      const orderCodes = Array.from(
                        new Set(
                          (grp.orders ?? [])
                            .map((o: any) => (o.orderCode || '').trim())
                            .filter((code: string) => code && code !== '(Tự sinh khi lưu)')
                        )
                      );

                      return (
                        <div
                          key={`mobile-${grp.groupKey}`}
                          role='button'
                          tabIndex={0}
                          onClick={() => handleOpenTripDetail(grp)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenTripDetail(grp);
                            }
                          }}
                          className='bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 active:bg-blue-50/30 transition-all cursor-pointer space-y-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                        >
                          {/* Row 1: Mã chuyến xe + Số đơn + Ngày xuất + Trạng thái */}
                          <div className='flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5'>
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              <span className='font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400'>
                                {grp.tripCode}
                              </span>
                              {grp.orders.length > 1 && (
                                <Badge
                                  variant='outline'
                                  className='text-[9px] px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 font-bold'
                                >
                                  {grp.orders.length} đơn
                                </Badge>
                              )}
                              <span className='text-[10px] text-slate-400 dark:text-slate-500 font-medium'>
                                • {formatTripDate(grp.receiveDate)}
                              </span>
                            </div>
                            <div className='shrink-0'>
                              <TripStopStatusBadge
                                status={isDispatched ? 'COMPLETED' : 'PENDING'}
                              />
                            </div>
                          </div>

                          {/* Row 2: Biển số xe & Tên tài xế */}
                          <div className='flex items-center justify-between text-xs gap-2'>
                            <div className='flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-100'>
                              <IconTruck className='h-3.5 w-3.5 text-blue-600 shrink-0' />
                              <span>{grp.licensePlate}</span>
                            </div>
                            {grp.driverName && (
                              <div className='text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]'>
                                {grp.driverName}
                              </div>
                            )}
                          </div>

                          {/* Row 3: Danh sách mã vận đơn */}
                          {orderCodes.length > 0 && (
                            <div className='text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded px-2 py-1 leading-snug'>
                              <span className='font-semibold text-slate-500 dark:text-slate-400 mr-1'>
                                Vận đơn:
                              </span>
                              <span className='font-mono break-all'>{orderCodes.join(', ')}</span>
                            </div>
                          )}

                          {/* Row 4: Số kiện, Tải trọng & Thể tích + Nút xem chi tiết */}
                          <div className='flex items-center justify-between pt-0.5 text-[11px] text-slate-600 dark:text-slate-300'>
                            <div className='flex items-center gap-2 font-medium'>
                              <span className='font-bold text-slate-800 dark:text-slate-100'>
                                {grp.totalQuantity} kiện
                              </span>
                              <span className='text-slate-300 dark:text-slate-600'>|</span>
                              <span>{formatWeight(grp.totalWeight)} kg</span>
                              <span className='text-slate-300 dark:text-slate-600'>|</span>
                              <span>{formatVolume(grp.totalVolume)} m³</span>
                            </div>
                            <div className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5 shrink-0'>
                              <span>Chi tiết</span>
                              <IconChevronRight className='h-3 w-3' />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Bar with Page Size Selector */}
                {vehicleGroups.length > 0 && (
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
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── View 2: Mode 1 - Xuất Kho (Editable Table + Lookup + Vehicle fields) ── */}
        {activeView === 'MODE1_CUSTOMER' && (
          <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
            <CardHeader className='py-1 px-1 border-b'>
              <CardTitle className='text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between'>
                <span>
                  {draftTripCode ? `Phiếu xuất nháp · ${draftTripCode}` : 'Tạo Phiếu Xuất Kho'}
                </span>
                <Badge className='bg-[#0F3D62] text-white font-mono'>
                  {draftTripCode ? 'Chờ xử lý' : 'Phiếu xuất kho'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className='p-1 space-y-1.5'>
              {/* Outbound Info Header: 3 Thông tin Xuất kho (Frame UVtv4 parity với Nhập kho) */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-2 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs'>
                {/* 1. Ngày xuất kho */}
                <div>
                  <label className='text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5'>
                    1. Ngày xuất kho <span className='text-red-600 font-black'>*</span>
                  </label>
                  <div className='relative'>
                    <IconCalendar className='absolute left-2.5 top-2.5 h-4 w-4 text-gray-400' />
                    <Input
                      type='date'
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className='h-9 pl-8 text-xs border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900 font-medium'
                    />
                  </div>
                </div>

                {/* 2. Biển số xe */}
                <div>
                  <label className='text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5'>
                    2. Biển số xe <span className='text-red-600 font-black'>*</span>
                  </label>
                  <div className='relative'>
                    <IconTruck className='absolute left-2.5 top-2.5 h-4 w-4 text-red-400' />
                    <Input
                      value={outboundLicensePlate}
                      onChange={(e) => setOutboundLicensePlate(e.target.value)}
                      placeholder='VD: 29C-123.45'
                      className='h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
                    />
                  </div>
                </div>

                {/* 3. Họ tên người nhận / tài xế */}
                <div>
                  <label className='text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5'>
                    3. Họ tên người nhận / tài xế{' '}
                    <span className='text-slate-400 font-normal'>(Tùy chọn)</span>
                  </label>
                  <div className='relative'>
                    <IconUser className='absolute left-2.5 top-2.5 h-4 w-4 text-slate-400' />
                    <Input
                      value={outboundDriverName}
                      onChange={(e) => setOutboundDriverName(e.target.value)}
                      placeholder='VD: Nguyễn Văn A'
                      className='h-9 pl-8 text-xs font-medium border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700'
                    />
                  </div>
                </div>
              </div>

              {hasDraftOrdersInNote && (
                <div className='flex items-center gap-1.5 p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] mb-2'>
                  <IconAlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
                  <span>
                    <strong>Lưu ý nghiệp vụ:</strong> Phiếu xuất này chứa đơn hàng đang ở trạng thái{' '}
                    <strong>Đơn nháp</strong>. Chuyến xe sẽ được lưu ở trạng thái{' '}
                    <strong>Chờ xử lý</strong> và không thể chuyển sang <strong>Đã xử lý</strong>{' '}
                    cho đến khi các đơn hàng được duyệt chính thức.
                  </span>
                </div>
              )}

              {/* Editable Grid with Lookup Icon */}
              <WarehouseEditableGrid
                rows={mode1Rows}
                onChange={setMode1Rows}
                isOutboundMode={true}
                onRefreshMetrics={handleRefreshMetrics}
                isLoadingMetrics={isRefreshing}
              />

              <div className='flex justify-between items-center pt-3 border-t'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    resetMode1Form();
                    setActiveView('BOARD');
                  }}
                >
                  Hủy bỏ
                </Button>
                <div className='flex items-center gap-2'>
                  {hasDraftOrdersInNote && (
                    <span className='text-[11px] text-amber-600 dark:text-amber-400 font-medium'>
                      ⚠️ Có đơn nháp — Chỉ được Lưu nháp
                    </span>
                  )}
                  <Button
                    variant={hasDraftOrdersInNote ? 'default' : 'outline'}
                    size='sm'
                    onClick={handleSaveDraftMode1}
                    disabled={isSavingDraft || isSubmitting}
                    className={`text-xs font-bold ${
                      hasDraftOrdersInNote
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                        : 'border-slate-300'
                    }`}
                  >
                    {isSavingDraft && <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />}
                    Lưu nháp (Chờ xử lý)
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      const validRows = mode1Rows.filter(
                        (r) =>
                          r.orderCode &&
                          r.orderCode !== '(Tự sinh khi lưu)' &&
                          r.orderCode.trim() !== ''
                      );
                      const targetRows = validRows.length > 0 ? validRows : mode1Rows;
                      const totalExportQty = targetRows.reduce(
                        (sum, r) => sum + (Number(r.totalQuantity) || 0),
                        0
                      );
                      const items = targetRows.map((r) => {
                        const itemDest = resolveRowOutboundDestination(r);
                        return {
                          orderCode: r.orderCode || '—',
                          goodsDescription: r.goodsDescription || 'Hàng hóa xuất kho',
                          quantity: Number(r.totalQuantity) || 0,
                          unit: 'Kiện',
                          destinationHub: itemDest,
                          deliveryAddress: itemDest,
                          province: r.province || '—',
                          accompanyingDocs: r.accompanyingDocs || '—',
                          notes: r.notes || ''
                        };
                      });
                      setSelectedReceiptData({
                        orderCode:
                          draftTripCode ||
                          (targetRows.length > 1
                            ? `CHUYẾN-${outboundLicensePlate || 'NHÁP'}`
                            : targetRows[0]?.orderCode || 'WH-OUT'),
                        tripCode: draftTripCode || undefined,
                        goodsDescription: targetRows
                          .map((r) => r.goodsDescription)
                          .filter(Boolean)
                          .join(', '),
                        totalQuantity: totalExportQty,
                        outboundQuantity: totalExportQty,
                        totalWeight: targetRows.reduce(
                          (sum, r) => sum + (Number(r.totalWeight) || 0),
                          0
                        ),
                        totalVolume: targetRows.reduce(
                          (sum, r) => sum + (Number(r.totalVolume) || 0),
                          0
                        ),
                        driverName: outboundDriverName || '—',
                        licensePlate: outboundLicensePlate || '—',
                        deliveryAddress: items[0]?.deliveryAddress || '—',
                        destinationHub: items[0]?.destinationHub || '—',
                        originHub: user?.hub?.name || '—',
                        mode: 'CUSTOMER',
                        dispatchDate: dispatchDate,
                        notes: targetRows
                          .map((r) => r.notes)
                          .filter(Boolean)
                          .join('; '),
                        items
                      });
                      setIsReceiptModalOpen(true);
                    }}
                    className='text-xs font-bold border-slate-300'
                  >
                    <IconPrinter className='mr-1 h-3.5 w-3.5 text-emerald-600' />
                    Xem trước
                  </Button>
                  <Button
                    onClick={() => handleSubmitOutbound('CUSTOMER')}
                    disabled={isSubmitting || isSavingDraft || hasDraftOrdersInNote}
                    className={`px-2 font-bold h-9 text-xs shadow-xs ${
                      hasDraftOrdersInNote
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                        : 'bg-[#0F3D62] text-white hover:bg-[#0c314f]'
                    }`}
                    title={
                      hasDraftOrdersInNote
                        ? 'Chuyến xe có đơn nháp chỉ được phép Lưu nháp (Chờ xử lý)'
                        : undefined
                    }
                  >
                    {isSubmitting ? (
                      <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <IconCircleCheck className='mr-2 h-4 w-4 text-emerald-400' />
                    )}
                    Xác nhận xuất kho
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── View 3: Mode 2 - Xuất Luân Chuyển Nội Bộ ── */}
        {activeView === 'MODE2_TRANSFER' && (
          <WarehouseOutboundTransferFlow
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
              fetchOrders();
            }}
          />
        )}

        {/* Outbound Receipt Modal for Printing */}
        <WarehouseOutboundReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          data={selectedReceiptData}
        />

        {/* Waybill Detail Modal (Read-only audit view) */}
        <WarehouseWaybillDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedWaybillForDetail(null);
          }}
          waybill={selectedWaybillForDetail}
        />

        {/* Vehicle Trip Detail Modal (Read-only view) */}
        <WarehouseTripDetailModal
          isOpen={isTripDetailModalOpen}
          onClose={() => {
            setIsTripDetailModalOpen(false);
            setSelectedTripGroup(null);
          }}
          tripGroup={selectedTripGroup}
          readOnly={true}
          mode='OUTBOUND'
          onSuccess={() => {
            fetchOrders();
          }}
          onOpenReceipt={handleOpenReceiptForVehicle}
        />
      </div>
    </PageContainer>
  );
}
