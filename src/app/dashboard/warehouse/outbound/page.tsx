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
  IconChevronDown,
  IconChevronRight,
  IconFoldUp,
  IconFoldDown,
  IconPencil,
  IconTrash
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { useDebounce } from '@/hooks/use-debounce';
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

  // Active View: 'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>(
    'BOARD'
  );

  // Board Filter & Data
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
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

  const handleOpenTripDetail = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripDetailModalOpen(true);
  };

  // Checkbox selection & batch confirm outbound
  const [selectedTripCodes, setSelectedTripCodes] = useState<string[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Expanded Vehicle Groups State
  const [expandedVehicleKeys, setExpandedVehicleKeys] = useState<Record<string, boolean>>({});

  const toggleExpandVehicle = (key: string) => {
    setExpandedVehicleKeys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Date Range Filter: Default from 1st of current month to today
  const getDefaultFromDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getDefaultToDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);

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

  // Transfer Mode 2 Stepper State
  const [transferHubId, setTransferHubId] = useState<string>('2');
  const [transferLicensePlate, setTransferLicensePlate] = useState('');
  const [transferDriverName, setTransferDriverName] = useState('');
  const [level1Hubs, setLevel1Hubs] = useState<any[]>([]);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? useAuthStore.getState()?.accessToken ||
          localStorage.getItem('access_token') ||
          document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]
        : null;

    fetch('/api/v1/hubs/active?level=1', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data) && data.length > 0) {
          setLevel1Hubs(data.filter((h: any) => h.level === 1 || !h.code.startsWith('HUB-BO-')));
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

  // Reset page to 1 when search, tab, or dates change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, boardStatus, fromDate, toDate]);

  // Fetch Board Trips (one row per SD trip of this hub: drafts + dispatched) + tab counters (same query)
  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(boardStatus !== 'ALL' ? { status: boardStatus } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {})
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
  }, [page, pageSize, debouncedSearch, boardStatus, fromDate, toDate]);

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

        // NestJS ResponseTransformInterceptor wraps payloads: { statusCode, message, data, ... }
        const json = await res.json();
        const freshData: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];
        const freshById = new Map(freshData.map((f) => [Number(f.id), f]));

        const applyFresh = (rows: WarehouseRowItem[]) =>
          rows.map((r) => {
            const fresh = freshById.get(Number(r.id));
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

  // Validate the note and build the request body shared by "Xác nhận xuất kho" and "Lưu nháp"
  const buildOutboundRequest = (mode: 'CUSTOMER' | 'TRANSFER') => {
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
    const validRows = activeRows.filter((r) => r.orderCode && r.orderCode.trim() !== '');

    if (validRows.length === 0) {
      toast.error('Vui lòng nhập hoặc chọn ít nhất một đơn hàng cần xuất kho');
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
    for (let i = 0; i < validRows.length; i++) {
      const rid = validRows[i].id;
      if (rid === undefined || rid === null || rid === '') continue;
      const key = String(rid);
      if (seenIds.has(key)) {
        toast.error(
          `Dòng hàng ${validRows[i].orderCode} đang bị chọn 2 lần trên phiếu. Vui lòng gộp số lượng vào một dòng.`
        );
        return null;
      }
      seenIds.set(key, i);
    }

    const orderIds = validRows.map((r) => Number(r.id)).filter((id) => !isNaN(id) && id > 0);

    // Auto-detect transfer mode if any item has destinationHubId specified
    const hasTransferItem = validRows.some(
      (r) =>
        r.destinationHubId && (!user?.hub?.id || Number(r.destinationHubId) !== Number(user.hub.id))
    );
    const effectiveMode: 'CUSTOMER' | 'TRANSFER' =
      mode === 'TRANSFER' || hasTransferItem ? 'TRANSFER' : 'CUSTOMER';
    const primaryDestHubId =
      mode === 'TRANSFER'
        ? parseInt(transferHubId, 10)
        : validRows.find((r) => r.destinationHubId)?.destinationHubId || undefined;

    const items = validRows
      .filter((r) => r.id && !isNaN(Number(r.id)))
      .map((r) => ({
        orderId: Number(r.id),
        quantityToExport: Number(r.totalQuantity) || 0,
        weightToExport: Number(r.totalWeight) || 0,
        volumeToExport: Number(r.totalVolume) || 0,
        destinationHubId: r.destinationHubId ? Number(r.destinationHubId) : undefined,
        deliveryMode: r.deliveryMode || undefined,
        deliveryAddress: r.deliveryAddress || undefined
      }));

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

    return { body, validRows, effectiveMode, primaryDestHubId };
  };

  // Submit Outbound
  const handleSubmitOutbound = async (mode: 'CUSTOMER' | 'TRANSFER') => {
    const request = buildOutboundRequest(mode);
    if (!request) return;
    const { body, validRows, effectiveMode, primaryDestHubId } = request;

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
      const transferHubName = isTransferReceipt
        ? level1Hubs.find((h: any) => String(h.id) === String(primaryDestHubId))?.name
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
        items: validRows.map((r) => ({
          orderCode: r.orderCode,
          goodsDescription: r.goodsDescription || '',
          quantity: Number(r.totalQuantity) || 0,
          unit: 'Kiện',
          deliveryAddress:
            effectiveMode === 'CUSTOMER'
              ? r.deliveryAddress || customerAddress || ''
              : r.deliveryAddress || '',
          province: r.province || '',
          accompanyingDocs: r.accompanyingDocs || '',
          notes: r.notes || ''
        }))
      });
      setIsReceiptModalOpen(true);

      setDraftTripCode(null);
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

  // "Tạo phiếu xuất": keeps an unfinished new note, but never continues a reopened draft by accident
  const handleOpenNewMode1 = () => {
    if (draftTripCode) resetMode1Form();
    setActiveView('MODE1_CUSTOMER');
  };

  // "Lưu nháp": persists the note as a draft trip (Chờ xử lý) — allocates SD code, no stock deduction
  const handleSaveDraftMode1 = async () => {
    const request = buildOutboundRequest('CUSTOMER');
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
      // Switching back to BOARD triggers the board effect with the "Chờ xử lý" filter applied
      setBoardStatus('PENDING');
      setActiveView('BOARD');
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể lưu nháp phiếu xuất kho');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // "Tiếp tục": reopen a draft trip on the outbound note to edit or confirm it
  const handleResumeDraft = (grp: InboundVehicleGroup) => {
    const rows: WarehouseRowItem[] = grp.orders.map((o: any) => {
      const plannedDest = o.plannedDestinationHubId ? Number(o.plannedDestinationHubId) : null;
      return {
        id: o.id,
        orderCode: o.orderCode,
        pickupAddress: o.pickupAddress || '',
        goodsDescription: o.goodsDescription || '',
        totalQuantity: Number(o.exportedQuantity) || 0,
        quantityToExport: Number(o.exportedQuantity) || 0,
        // Drafts do not hold stock: available stock at this hub is the live ledger figure
        remainingQuantity: availableOutboundStock(o),
        totalWeight: Number(o.exportedWeight) || 0,
        totalVolume: Number(o.exportedVolume) || 0,
        deliveryMode: plannedDest ? 'HUB_L1' : 'DIRECT_CUSTOMER',
        deliveryAddress: plannedDest ? '' : o.deliveryAddress || '',
        originalDeliveryAddress: o.deliveryAddress || '',
        destinationHubId: plannedDest,
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
    if (!window.confirm(`Hủy chuyến nháp ${tripCode}? Các dòng hàng dự kiến xuất sẽ bị xóa khỏi chuyến.`)) {
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

  // Trip rows come pre-grouped from the backend (one row per SD trip dispatched from this hub)
  const vehicleGroups: InboundVehicleGroup[] = useMemo(
    () =>
      tripGroups.map((g) => {
        const descs = Array.from(
          new Set((g.orders ?? []).map((x: any) => x.goodsDescription).filter(Boolean))
        ) as string[];
        return {
          groupKey: g.tripCode,
          licensePlate: g.licensePlate?.trim()?.toUpperCase() || 'XE XUẤT KHO',
          driverName: g.driverName?.trim() || '',
          tripCode: g.tripCode,
          receiveDate:
            typeof g.dispatchDate === 'string' ? g.dispatchDate.split('T')[0] : undefined,
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
          notes: g.notes || ''
        };
      }),
    [tripGroups]
  );

  // Draft trips ("Chờ xử lý") are the only rows that can still be dispatched from the board
  const draftGroups = useMemo(
    () => vehicleGroups.filter((g) => g.status === 'PENDING'),
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

  // Batch "Xác nhận xuất": dispatches each selected draft trip exactly as saved (keeps its SD code)
  const handleBatchConfirmOutbound = async () => {
    const targets = draftGroups.filter((g) => selectedTripCodes.includes(g.tripCode));
    if (targets.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 chuyến nháp để xác nhận xuất kho');
      return;
    }

    setIsBatchSubmitting(true);
    const token = tokenManager.getAccessToken();
    let successCount = 0;

    try {
      for (const grp of targets) {
        const items = grp.orders.map((o: any) => ({
          orderId: Number(o.id),
          quantityToExport: Number(o.exportedQuantity) || 0,
          weightToExport: Number(o.exportedWeight) || 0,
          volumeToExport: Number(o.exportedVolume) || 0,
          destinationHubId: o.plannedDestinationHubId
            ? Number(o.plannedDestinationHubId)
            : undefined
        }));
        const destHubId = items.find((i) => i.destinationHubId)?.destinationHubId;
        const res = await fetch('/api/v1/warehouse/outbound/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            orderIds: items.map((i) => i.orderId),
            items,
            mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
            destinationHubId: destHubId,
            licensePlate: grp.licensePlate === 'XE XUẤT KHO' ? undefined : grp.licensePlate,
            driverName: grp.driverName || undefined,
            dispatchDate: grp.receiveDate || undefined,
            draftTripCode: grp.tripCode
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: res.statusText }));
          throw { response: { data: errData, status: res.status } };
        }
        successCount += 1;
      }

      toast.success(`Đã xác nhận xuất kho ${successCount} chuyến xe!`);
    } catch (err: any) {
      showApiErrorToast(
        err,
        successCount > 0
          ? `Đã xuất ${successCount} chuyến, các chuyến còn lại chưa xuất được`
          : 'Lỗi khi xác nhận xuất kho hàng loạt'
      );
    } finally {
      setSelectedTripCodes([]);
      setIsBatchSubmitting(false);
      fetchOrders();
    }
  };

  // Quick export for an entire vehicle trip
  const handleExportVehicleTrip = async (grp: InboundVehicleGroup) => {
    const exportableOrders = grp.orders.filter((o) =>
      ['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.hubStatus ?? o.status)
    );
    if (exportableOrders.length === 0) {
      toast.error('Không có đơn hàng nào chờ xuất kho trong chuyến xe này');
      return;
    }

    const token = tokenManager.getAccessToken();
    try {
      const res = await fetch('/api/v1/warehouse/outbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderIds: exportableOrders.map((o) => o.id),
          mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
          licensePlate: grp.licensePlate !== 'CHƯA GÁN XE' ? grp.licensePlate : undefined,
          driverName: grp.driverName || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xuất kho chuyến xe ${grp.licensePlate} (${exportableOrders.length} đơn)!`);
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất chuyến xe');
    }
  };

  // Open Outbound Receipt modal for an entire vehicle trip
  const handleOpenReceiptForVehicle = (grp: InboundVehicleGroup) => {
    // "Xuất tại kho" = the hub that dispatched this vehicle (hub of creator / dispatch transaction).
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
      ...level1Hubs
    ];
    const orig =
      dispatchTx?.hub?.name ||
      knownHubs.find((h: any) => h?.id && dispatchTx?.hubId && Number(h.id) === Number(dispatchTx.hubId))?.name ||
      tripRecord?.originHub?.name ||
      firstOrder?.originHubEntity?.name ||
      user?.hub?.name ||
      '';
    const dest =
      grp.orders[0]?.destinationHubEntity?.name ||
      grp.orders[0]?.destinationHub ||
      grp.orders[0]?.deliveryAddress?.trim() ||
      '';

    const items: OutboundReceiptItem[] = grp.orders.map((o) => {
      const tripTx = o.inventoryTransactions?.find(
        (tx: any) =>
          (tx?.type === 'OUTBOUND' || tx?.type === 'TRANSFER') &&
          (grp.tripCode === '—' || !tx?.tripCode || tx.tripCode === grp.tripCode)
      );
      const exportedQty =
        o.exportedQuantity != null
          ? Number(o.exportedQuantity)
          : tripTx
            ? Number(tripTx.quantity || 0)
            : Number(o.outboundQuantity || o.totalQuantity || 1);
      const itemDestination =
        o.destinationHub ||
        o.destinationHubEntity?.name ||
        o.deliveryAddress ||
        dest;
      return {
        orderCode: o.orderCode,
        goodsDescription: o.goodsDescription || 'Hàng hóa xuất kho',
        quantity: exportedQty,
        unit: 'Kiện',
        destinationHub: itemDestination,
        deliveryAddress: itemDestination,
        province: o.province || o.destinationHubEntity?.province || '—',
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
      deliveryAddress: dest,
      destinationHub: dest,
      originHub: orig,
      mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
      dispatchDate: grp.receiveDate || new Date().toISOString().split('T')[0],
      notes: grp.notes || '',
      items
    };
    setSelectedReceiptData(receiptData);
    setIsReceiptModalOpen(true);
  };

  // Open Outbound Receipt modal for printing
  const handlePrintOrderReceipt = (o: any, tripCode?: string) => {
    const tripTx = o.inventoryTransactions?.find(
      (tx: any) =>
        (tx?.type === 'OUTBOUND' || tx?.type === 'TRANSFER') &&
        (!tripCode || tripCode === '—' || !tx?.tripCode || tx.tripCode === tripCode)
    ) || o.inventoryTransactions?.find(
      (tx: any) => tx?.type === 'OUTBOUND' || tx?.type === 'TRANSFER'
    );
    const exportedQty = tripTx
      ? Number(tripTx.quantity || 0)
      : Number(o.outboundQuantity || o.totalQuantity || 1);
    const contractTotal = Math.max(Number(o.totalQuantity || 1), 1);
    const exportedWeight =
      tripTx?.weight != null
        ? Number(tripTx.weight)
        : (Number(o.totalWeight || 0) * exportedQty) / contractTotal;
    const exportedVolume =
      tripTx?.volume != null
        ? Number(tripTx.volume)
        : (Number(o.totalVolume || 0) * exportedQty) / contractTotal;

    const tripRecord = tripCode && tripCode !== '—'
      ? o.trips?.find((t: any) => t.tripCode === tripCode) || o.trips?.[0]
      : o.trips?.[0];
    const knownHubs = [
      tripTx?.hub,
      tripRecord?.originHub,
      o.originHubEntity,
      o.currentHubEntity,
      o.destinationHubEntity,
      ...level1Hubs
    ];
    const orig =
      tripTx?.hub?.name ||
      knownHubs.find((h: any) => h?.id && tripTx?.hubId && Number(h.id) === Number(tripTx.hubId))?.name ||
      tripRecord?.originHub?.name ||
      o.originHubEntity?.name ||
      user?.hub?.name ||
      '';

    const dest =
      o.destinationHub ||
      o.destinationHubEntity?.name ||
      o.deliveryAddress ||
      '';

    const receiptData: OutboundReceiptData = {
      tripCode: tripCode && tripCode !== '—' ? tripCode : undefined,
      orderCode:
        tripTx?.invoiceCode ||
        (tripCode && tripCode !== '—' ? tripCode : o.orderCode) ||
        `WH-OUT-${o.id}`,
      goodsDescription: o.goodsDescription || 'Hàng tổng quan',
      totalQuantity: exportedQty,
      outboundQuantity: exportedQty,
      totalWeight: Math.round(exportedWeight * 100) / 100,
      totalVolume: Math.round(exportedVolume * 1000) / 1000,
      driverName: tripRecord?.driverName || o.trips?.[0]?.driverName || o.driverName || '',
      licensePlate: tripRecord?.licensePlate || o.trips?.[0]?.licensePlate || o.vehicleLicensePlate || '',
      deliveryAddress: dest,
      destinationHub: dest,
      originHub: orig,
      mode: (o.destinationHub || o.destinationHubEntity?.name) ? 'TRANSFER' : 'CUSTOMER',
      dispatchDate: o.updatedAt
        ? new Date(o.updatedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      notes: o.notes || '',
      accompanyingDocs: o.accompanyingDocs || '—',
      items: [
        {
          orderCode: o.orderCode,
          goodsDescription: o.goodsDescription || 'Hàng tổng quan',
          quantity: exportedQty,
          unit: 'Kiện',
          destinationHub: dest,
          deliveryAddress: dest,
          province: o.province || o.destinationHubEntity?.province || '—',
          accompanyingDocs: o.accompanyingDocs || '—',
          notes: o.notes || ''
        }
      ]
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
              <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
                <IconTruck className='h-6 w-6' />
                <span>Xuất kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
              </h1>
              <p className='text-xs text-slate-500 mt-0.5'>
                Lập kế hoạch xuất hàng cho khách hoặc điều chuyển sang Hub khác / Tuyến xe bo.
              </p>
            </div>

            {activeView === 'BOARD' ? (
              <div className='flex items-center gap-2'>
                <Button
                  onClick={handleOpenNewMode1}
                  className='bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold'
                >
                  <IconPlus className='mr-1 h-4 w-4' /> Xuất kho
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
        )}

        {/* ── View 1: Main Outbound Board (Stat Cards removed per feedback_17_8) ── */}
        {activeView === 'BOARD' && (
          <div className='space-y-1.5'>
            {/* Toolbar with Search, Date Range Filter, Status Tabs & Refresh Button */}
            <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
              <CardContent className='p-1 space-y-1.5'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  {/* Search Box & Date Range Filter */}
                  <div className='flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]'>
                    {/* Search Box */}
                    <div className='relative flex-1 min-w-[200px]'>
                      <IconSearch className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Tìm kiếm theo mã đơn, biển số xe, tên hàng...'
                        className='pl-9 h-9 text-xs'
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
                        max={toDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className='px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                      />
                      <span className='text-slate-400 font-medium px-0.5'>đến:</span>
                      <input
                        type='date'
                        aria-label='Đến ngày'
                        value={toDate}
                        min={fromDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className='px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7'
                      />
                      {(fromDate !== getDefaultFromDate() || toDate !== getDefaultToDate()) && (
                        <button
                          type='button'
                          onClick={() => {
                            setFromDate(getDefaultFromDate());
                            setToDate(getDefaultToDate());
                          }}
                          className='text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 font-medium'
                          title='Đặt lại về tháng này'
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Processing Status Tabs (trip status at this hub) */}
                  <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto'>
                    {[
                      { key: 'ALL', label: `Tất cả (${tripCounts.allCount ?? 0})` },
                      { key: 'PENDING', label: `Chờ xử lý (${tripCounts.pendingCount ?? 0})` },
                      { key: 'COMPLETED', label: `Đã xử lý (${tripCounts.completedCount ?? 0})` }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setBoardStatus(tab.key as typeof boardStatus)}
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

                  {/* Collapse / Expand All Button */}
                  {vehicleGroups.length > 0 && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={toggleAllGroups}
                      className='h-9 text-xs font-semibold border-slate-300 dark:border-slate-700'
                      title={
                        allExpanded ? 'Thu gọn tất cả các nhóm xe' : 'Mở rộng tất cả các nhóm xe'
                      }
                    >
                      {allExpanded ? (
                        <>
                          <IconFoldUp className='mr-1.5 h-4 w-4 text-slate-600 dark:text-slate-400' />
                          Thu gọn tất cả ({vehicleGroups.length} xe)
                        </>
                      ) : (
                        <>
                          <IconFoldDown className='mr-1.5 h-4 w-4 text-slate-600 dark:text-slate-400' />
                          Mở rộng tất cả ({vehicleGroups.length} xe)
                        </>
                      )}
                    </Button>
                  )}

                  {/* Refresh Metrics Button */}
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleRefreshMetrics}
                    disabled={isRefreshing}
                    className='h-9 text-xs font-bold border-slate-300'
                  >
                    <IconRefresh
                      className={`mr-1.5 h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    Cập nhật lại thông số
                  </Button>
                </div>

                {/* Batch Action Bar */}
                {selectedTripCodes.length > 0 && (
                  <div className='bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 flex items-center justify-between'>
                    <span className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                      Đã chọn {selectedTripCodes.length} chuyến nháp
                    </span>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setSelectedTripCodes([])}
                        className='h-7 text-xs text-slate-600'
                      >
                        Bỏ chọn
                      </Button>
                      <Button
                        size='sm'
                        onClick={handleBatchConfirmOutbound}
                        disabled={isBatchSubmitting}
                        className='h-7 text-xs font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f]'
                      >
                        {isBatchSubmitting ? (
                          <>
                            <IconLoader2 className='h-3.5 w-3.5 mr-1 animate-spin' /> Đang xuất
                            kho...
                          </>
                        ) : (
                          <>
                            <IconCircleCheck className='h-3.5 w-3.5 mr-1 text-emerald-400' /> Xác
                            nhận xuất {selectedTripCodes.length} chuyến
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Outbound Board Table (Frame sq2P6 parity với Inbound) */}
                <div className='border rounded-lg overflow-hidden'>
                  <table className='w-full text-[11px] text-left'>
                    <thead className='bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[10px]'>
                      <tr>
                        <th className='py-1.5 px-2 w-[36px] text-center'>
                          <input
                            type='checkbox'
                            disabled={draftGroups.length === 0}
                            title='Chọn tất cả chuyến nháp trên trang'
                            checked={
                              draftGroups.length > 0 &&
                              draftGroups.every((g) => selectedTripCodes.includes(g.tripCode))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTripCodes(draftGroups.map((g) => g.tripCode));
                              } else {
                                setSelectedTripCodes([]);
                              }
                            }}
                            className={`rounded border-gray-300 text-blue-600 ${
                              draftGroups.length === 0
                                ? 'opacity-40 cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
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
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className='p-2 text-center text-gray-500'>
                            <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                            Đang tải danh sách đơn xuất kho...
                          </td>
                        </tr>
                      ) : vehicleGroups.length === 0 ? (
                        <tr>
                          <td colSpan={6} className='p-2 text-center text-gray-400'>
                            Không có chuyến xe xuất kho phù hợp bộ lọc
                          </td>
                        </tr>
                      ) : (
                        vehicleGroups.map((grp) => {
                          const isExpanded = !!expandedVehicleKeys[grp.groupKey];
                          const isGroupSelected = selectedTripCodes.includes(grp.tripCode);
                          // Trip status at this hub comes from the backend: COMPLETED = đã xuất, PENDING = nháp
                          const isDispatched = grp.status === 'COMPLETED';
                          const isDraft = grp.status === 'PENDING';
                          const canExport = isDraft;

                          return (
                            <React.Fragment key={grp.groupKey}>
                              <tr className='hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors'>
                                <td className='py-1 px-2 text-center'>
                                  <input
                                    type='checkbox'
                                    checked={isGroupSelected}
                                    disabled={!canExport}
                                    title={
                                      !canExport
                                        ? 'Chuyến xe đã xuất kho hoàn tất'
                                        : 'Chọn chuyến nháp để xác nhận xuất kho'
                                    }
                                    onChange={(e) => {
                                      if (!canExport) return;
                                      if (e.target.checked) {
                                        setSelectedTripCodes((prev) =>
                                          Array.from(new Set([...prev, grp.tripCode]))
                                        );
                                      } else {
                                        setSelectedTripCodes((prev) =>
                                          prev.filter((code) => code !== grp.tripCode)
                                        );
                                      }
                                    }}
                                    className={`rounded border-gray-300 text-blue-600 ${
                                      !canExport ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
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
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => handleOpenReceiptForVehicle(grp)}
                                        className='h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 px-2 font-semibold'
                                        title='In phiếu xuất xe (chứa tất cả đơn hàng của xe)'
                                      >
                                        <IconPrinter className='h-3.5 w-3.5 mr-1' /> In phiếu xuất
                                      </Button>
                                    )}
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
                                            <th className='py-0.5 px-1.5 font-semibold min-w-[150px]'>
                                              HÀNG HÓA
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-right w-[130px]'>
                                              SỐ KIỆN / TẢI TRỌNG
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-center w-[100px]'>
                                              CHỨNG TỪ
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold min-w-[130px]'>
                                              GHI CHÚ
                                            </th>
                                            <th className='py-0.5 px-1.5 font-semibold text-center w-[150px]'>
                                              THAO TÁC
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-100 dark:divide-slate-700'>
                                          {grp.orders.map((subOrder) => {
                                            // Backend sums this trip's lines per order: dispatch invoice (đã xuất) or planned line (nháp)
                                            const exportedQty = Number(subOrder.exportedQuantity ?? 0);
                                            const contractTotal = Math.max(Number(subOrder.totalQuantity || 1), 1);
                                            const exportedWeight = Number(subOrder.exportedWeight ?? 0);
                                            const exportedVolume = Number(subOrder.exportedVolume ?? 0);

                                            const isSubOrderDispatched = isDispatched;

                                            const displayStatus = isSubOrderDispatched
                                              ? 'COMPLETED_INBOUND'
                                              : (subOrder.hubStatus ?? subOrder.status);

                                            return (
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
                                                  {subOrder.goodsDescription || 'Hàng hóa xuất kho'}
                                                </td>
                                                <td className='py-1 px-1.5 text-right font-semibold text-slate-700 dark:text-slate-300 text-[10px]'>
                                                  <div>
                                                    {exportedQty} kiện
                                                    {exportedQty !== contractTotal && (
                                                      <span className='text-[9px] font-normal text-slate-400 ml-1'>
                                                        ({exportedQty}/{contractTotal} kiện)
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className='text-gray-400 text-[9px]'>
                                                    {formatWeight(exportedWeight)} kg &bull;{' '}
                                                    {formatVolume(exportedVolume)} m³
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
                                                <td className='py-1 px-1.5 text-center'>
                                                  {isDispatched ? (
                                                    <Button
                                                      variant='outline'
                                                      size='sm'
                                                      onClick={() => handlePrintOrderReceipt(subOrder, grp.tripCode)}
                                                      className='h-6 text-[10px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2'
                                                    >
                                                      <IconPrinter className='h-3 w-3 mr-1' /> In phiếu
                                                    </Button>
                                                  ) : (
                                                    <span className='text-[10px] text-slate-400'>—</span>
                                                  )}
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
                <span>{draftTripCode ? `Phiếu xuất nháp · ${draftTripCode}` : 'Tạo Phiếu Xuất Kho'}</span>
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

              {/* Editable Grid with Lookup Icon */}
              <WarehouseEditableGrid
                rows={mode1Rows}
                onChange={setMode1Rows}
                isOutboundMode={true}
                onRefreshMetrics={handleRefreshMetrics}
                isLoadingMetrics={isRefreshing}
              />

              <div className='flex justify-between items-center pt-3 border-t'>
                <Button variant='outline' size='sm' onClick={() => setActiveView('BOARD')}>
                  Hủy bỏ
                </Button>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleSaveDraftMode1}
                    disabled={isSavingDraft || isSubmitting}
                    className='text-xs font-bold border-slate-300'
                  >
                    {isSavingDraft && <IconLoader2 className='mr-1 h-3.5 w-3.5 animate-spin' />}
                    Lưu nháp
                  </Button>
                  <Button
                    onClick={() => handleSubmitOutbound('CUSTOMER')}
                    disabled={isSubmitting || isSavingDraft}
                    className='bg-[#0F3D62] text-white hover:bg-[#0c314f] px-2 font-bold h-9 text-xs shadow-xs'
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
            onBackToBoard={() => setActiveView('BOARD')}
            onSwitchToCustomerMode={() => setActiveView('MODE1_CUSTOMER')}
            onSuccess={() => {
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
          onOpenReceipt={
            selectedTripGroup?.status === 'COMPLETED' ? handleOpenReceiptForVehicle : undefined
          }
        />
      </div>
    </PageContainer>
  );
}
