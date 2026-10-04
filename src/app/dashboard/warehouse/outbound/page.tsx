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
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { WarehouseOutboundTransferFlow } from '@/features/warehouse/components/warehouse-outbound-transfer-flow';
import { WarehouseOutboundReceiptModal, OutboundReceiptData } from '@/features/warehouse/components/warehouse-outbound-receipt-modal';
import {
  WarehouseTripDetailModal,
  type InboundVehicleGroup,
  WarehouseWaybillDetailModal,
} from '@/features/warehouse/components';
import type { WaybillDetailData } from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';

export default function WarehouseOutboundPage() {
  const user = useAuthStore((state) => state.user);

  // Active View: 'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>('BOARD');

  // Board Filter & Data
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Outbound Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<OutboundReceiptData | null>(null);

  // Waybill Detail Modal State (Read-only audit view)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWaybillForDetail, setSelectedWaybillForDetail] = useState<WaybillDetailData | null>(null);

  // Vehicle Trip Detail Modal State (Read-only audit view: "khi click vào TRIP cũng sẽ tương tự như chỉ là dạng view thôi")
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTripGroup, setSelectedTripGroup] = useState<InboundVehicleGroup | null>(null);

  const handleOpenTripDetail = (grp: InboundVehicleGroup) => {
    setSelectedTripGroup(grp);
    setIsTripDetailModalOpen(true);
  };

  // Checkbox selection & batch confirm outbound
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Expanded Vehicle Groups State
  const [expandedVehicleKeys, setExpandedVehicleKeys] = useState<Record<string, boolean>>({});

  const toggleExpandVehicle = (key: string) => {
    setExpandedVehicleKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
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

  // KPI Stats
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    waitingInbound: 0,
    customerInbound: 0,
    transferInbound: 0,
    storedInbound: 0,
    waitingOutbound: 0,
    customerOutbound: 0,
    transferOutbound: 0,
    completedOutboundToday: 0,
    completedOutbound: 0,
  });

  const fetchKpi = useCallback(() => {
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    });
    fetch(`/api/v1/warehouse/kpi?${query.toString()}`, {
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
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

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
      pickupAddress: user?.hub?.name || 'Kho xuất hàng',
      goodsDescription: '',
      totalQuantity: 1,
      totalWeight: 0,
      totalVolume: 0,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '',
      notes: '',
    },
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
      pickupAddress: user?.hub?.name || 'Kho xuất hàng',
      goodsDescription: '',
      totalQuantity: 1,
      totalWeight: 0,
      totalVolume: 0,
      deliveryMode: 'HUB_L1',
      deliveryAddress: '',
      notes: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Board Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Reset page to 1 when search, tab, or dates change
  useEffect(() => {
    setPage(1);
  }, [search, statusTab, fromDate, toDate]);

  // Fetch Board Orders
  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token =
      typeof window !== 'undefined'
        ? useAuthStore.getState()?.accessToken ||
          localStorage.getItem('access_token') ||
          document.cookie.match(/(?:^|; )access_token=([^;]*)/)?.[1]
        : null;
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusTab !== 'ALL' ? { status: statusTab } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
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
        if (resData?.meta) {
          setMeta({
            total: resData.meta.total ?? 0,
            page: resData.meta.page ?? 1,
            limit: resData.meta.limit ?? pageSize,
            totalPages: resData.meta.totalPages ?? 1,
          });
        }
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusTab, fromDate, toDate]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchOrders();
    }
  }, [activeView, fetchOrders]);

  // Refresh Metrics Button Action
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = tokenManager.getAccessToken();

    try {
      const activeRows = activeView === 'MODE1_CUSTOMER' ? mode1Rows : mode2Rows;
      const orderIds = activeRows
        .map((r) => Number(r.id))
        .filter((id) => !isNaN(id) && id > 0);

      if (orderIds.length > 0) {
        const res = await fetch('/api/v1/orders/refresh-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderIds }),
        });

        if (res.ok) {
          const freshData: any[] = await res.json();
          if (activeView === 'MODE1_CUSTOMER') {
            setMode1Rows((prev) =>
              prev.map((r) => {
                const fresh = freshData.find((f) => f.id === r.id);
                return fresh
                  ? {
                      ...r,
                      totalQuantity: fresh.totalQuantity || r.totalQuantity,
                      totalWeight: fresh.totalWeight || r.totalWeight,
                      totalVolume: fresh.totalVolume || r.totalVolume,
                    }
                  : r;
              }),
            );
          }
          toast.success('Đã tải lại thông số tải trọng và khối lượng tươi mới nhất!');
        }
      } else {
        fetchKpi();
        fetchOrders();
        toast.success('Đã cập nhật lại thông số danh sách xuất kho!');
      }
    } catch {
      toast.error('Không thể cập nhật thông số lúc này');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Submit Outbound
  const handleSubmitOutbound = async (mode: 'CUSTOMER' | 'TRANSFER') => {
    if (mode === 'CUSTOMER') {
      if (!outboundLicensePlate.trim()) {
        toast.error('Vui lòng nhập Biển số xe xuất kho (bắt buộc)');
        return;
      }
    } else if (mode === 'TRANSFER') {
      if (!transferLicensePlate.trim()) {
        toast.error('Vui lòng nhập Biển số xe luân chuyển (bắt buộc)');
        return;
      }
    }

    const activeRows = mode === 'CUSTOMER' ? mode1Rows : mode2Rows;
    const validRows = activeRows.filter((r) => r.orderCode && r.orderCode.trim() !== '');

    if (validRows.length === 0) {
      toast.error('Vui lòng nhập hoặc chọn ít nhất một đơn hàng cần xuất kho');
      return;
    }

    // Partial stock validation
    for (const r of validRows) {
      const exportQty = Number(r.totalQuantity) || 0;
      if (exportQty <= 0) {
        toast.error(`Đơn ${r.orderCode}: Số lượng xuất phải lớn hơn 0`);
        return;
      }
      if (r.remainingQuantity !== undefined && r.remainingQuantity !== null) {
        if (exportQty > r.remainingQuantity) {
          toast.error(
            `Đơn ${r.orderCode}: Số lượng xuất (${exportQty}) vượt quá tồn kho hiện tại (${r.remainingQuantity} kiện)!`
          );
          return;
        }
      }
    }

    const orderIds = validRows
      .map((r) => Number(r.id))
      .filter((id) => !isNaN(id) && id > 0);

    const items = validRows
      .filter((r) => r.id && !isNaN(Number(r.id)))
      .map((r) => ({
        orderId: Number(r.id),
        quantityToExport: Number(r.totalQuantity) || 0,
        weightToExport: Number(r.totalWeight) || 0,
        volumeToExport: Number(r.totalVolume) || 0,
      }));

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
          orderIds: orderIds.length > 0 ? orderIds : undefined,
          items: items.length > 0 ? items : undefined,
          mode,
          customerName: mode === 'CUSTOMER' ? customerName : undefined,
          customerPhone: mode === 'CUSTOMER' ? customerPhone : undefined,
          deliveryAddress: mode === 'CUSTOMER' ? customerAddress : undefined,
          destinationHubId: mode === 'TRANSFER' ? parseInt(transferHubId, 10) : undefined,
          licensePlate: mode === 'TRANSFER' ? transferLicensePlate : outboundLicensePlate,
          driverName: mode === 'TRANSFER' ? transferDriverName : outboundDriverName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(
        mode === 'CUSTOMER'
          ? 'Đã xác nhận xuất kho thành công!'
          : 'Đã lập phiếu xuất luân chuyển và sẵn sàng in Loading Plan!',
      );

      // Open Outbound Receipt Modal for printing
      setSelectedReceiptData({
        orderCode: validRows[0]?.orderCode || 'WH-OUT',
        goodsDescription:
          validRows
            .map((r) => r.goodsDescription)
            .filter(Boolean)
            .join(', ') || 'Hàng xuất kho',
        totalQuantity: validRows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 1), 0),
        outboundQuantity: validRows.reduce((sum, r) => sum + (Number(r.totalQuantity) || 1), 0),
        totalWeight: validRows.reduce((sum, r) => sum + (Number(r.totalWeight) || 0), 0),
        totalVolume: validRows.reduce((sum, r) => sum + (Number(r.totalVolume) || 0), 0),
        driverName: outboundDriverName,
        licensePlate: outboundLicensePlate,
        deliveryAddress: customerAddress,
        mode: 'CUSTOMER',
        dispatchDate: dispatchDate,
        notes: validRows.map((r) => r.notes).filter(Boolean).join('; ') || '',
      });
      setIsReceiptModalOpen(true);

      setActiveView('BOARD');
      fetchKpi();
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraftMode1 = () => {
    if (!outboundLicensePlate.trim()) {
      toast.error('Vui lòng nhập Biển số xe để lưu nháp');
      return;
    }
    toast.success('Đã lưu nháp phiếu xuất kho thành công!');
    setActiveView('BOARD');
  };

  // Group outbound orders by vehicle / trip (identical structure to Inbound)
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
      grp.totalQuantity += Number(o.totalQuantity ?? 1);
      grp.totalWeight += Number(o.totalWeight ?? 0);
      grp.totalVolume += Number(o.totalVolume ?? 0);

      // If any order is waiting/draft/inbound, show that status
      if (['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.status)) {
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

  // Batch Outbound Confirmation
  const handleBatchConfirmOutbound = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 đơn hàng để xuất kho');
      return;
    }

    setIsBatchSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      const res = await fetch('/api/v1/warehouse/outbound/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          mode: 'CUSTOMER',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xác nhận xuất kho thành công cho ${selectedOrderIds.length} đơn hàng!`);
      setSelectedOrderIds([]);
      fetchKpi();
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xác nhận xuất kho hàng loạt');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  // Quick export for an entire vehicle trip
  const handleExportVehicleTrip = async (grp: InboundVehicleGroup) => {
    const exportableOrders = grp.orders.filter((o) =>
      ['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.status),
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderIds: exportableOrders.map((o) => o.id),
          mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
          licensePlate: grp.licensePlate !== 'CHƯA GÁN XE' ? grp.licensePlate : undefined,
          driverName: grp.driverName || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xuất kho chuyến xe ${grp.licensePlate} (${exportableOrders.length} đơn)!`);
      fetchKpi();
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất chuyến xe');
    }
  };

  // Open Outbound Receipt modal for an entire vehicle trip
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

    const receiptData: OutboundReceiptData = {
      orderCode: grp.orders[0]?.orderCode || grp.tripCode,
      goodsDescription: grp.goodsDescription,
      totalQuantity: grp.totalQuantity,
      outboundQuantity: grp.totalQuantity,
      totalWeight: grp.totalWeight,
      totalVolume: grp.totalVolume,
      driverName: grp.driverName,
      licensePlate: grp.licensePlate,
      deliveryAddress: dest,
      destinationHub: dest,
      mode: grp.isTransfer ? 'TRANSFER' : 'CUSTOMER',
      dispatchDate: grp.receiveDate || new Date().toISOString().split('T')[0],
      notes: grp.notes || '',
    };
    setSelectedReceiptData(receiptData);
    setIsReceiptModalOpen(true);
  };

  // Open Outbound Receipt modal for printing
  const handlePrintOrderReceipt = (o: any) => {
    const receiptData: OutboundReceiptData = {
      orderCode: o.orderCode || `WH-OUT-${o.id}`,
      goodsDescription: o.goodsDescription || 'Hàng tổng quan',
      totalQuantity: o.totalQuantity ?? 1,
      outboundQuantity: o.outboundQuantity ?? o.totalQuantity ?? 1,
      totalWeight: o.totalWeight || 0,
      totalVolume: o.totalVolume || 0,
      driverName: o.trips?.[0]?.driverName || o.driverName || '',
      licensePlate: o.trips?.[0]?.licensePlate || o.vehicleLicensePlate || '',
      deliveryAddress: o.deliveryAddress || o.destinationHub || '',
      destinationHub: o.destinationHub || '',
      mode: o.destinationHub ? 'TRANSFER' : 'CUSTOMER',
      dispatchDate: o.updatedAt
        ? new Date(o.updatedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      notes: o.notes || '',
    };
    setSelectedReceiptData(receiptData);
    setIsReceiptModalOpen(true);
  };

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className="space-y-4 flex-1 w-full min-w-0">
        {/* ── Page Header (Board & Mode 1 Customer) ── */}
        {activeView !== 'MODE2_TRANSFER' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400">
                <IconTruck className="h-6 w-6" />
                <span>Xuất kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Lập kế hoạch xuất hàng cho khách hoặc điều chuyển sang Hub khác / Tuyến xe bo.
              </p>
            </div>

            {activeView === 'BOARD' ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setActiveView('MODE1_CUSTOMER')}
                  className="bg-[#0F3D62] text-white hover:bg-[#0c314f] text-xs font-bold"
                >
                  <IconPlus className="mr-1 h-4 w-4" /> Xuất kho
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
        )}

      {/* ── View 1: Main Outbound Board (Stat Cards removed per feedback_17_8) ── */}
      {activeView === 'BOARD' && (
        <div className="space-y-4">
          {/* Toolbar with Search, Date Range Filter, Status Tabs & Refresh Button */}
          <Card className="bg-white dark:bg-slate-900 shadow-sm border">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Box & Date Range Filter */}
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Search Box */}
                  <div className="relative flex-1 min-w-[200px]">
                    <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm kiếm theo mã đơn, biển số xe, tên hàng..."
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  {/* Date Range: Từ ngày -> Đến ngày */}
                  <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                      <IconCalendar className="h-3.5 w-3.5 text-[#0F3D62] dark:text-blue-400" />
                      <span>Từ:</span>
                    </div>
                    <input
                      type="date"
                      aria-label="Từ ngày"
                      value={fromDate}
                      max={toDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7"
                    />
                    <span className="text-slate-400 font-medium px-0.5">đến:</span>
                    <input
                      type="date"
                      aria-label="Đến ngày"
                      value={toDate}
                      min={fromDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0F3D62] cursor-pointer h-7"
                    />
                    {(fromDate !== getDefaultFromDate() || toDate !== getDefaultToDate()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFromDate(getDefaultFromDate());
                          setToDate(getDefaultToDate());
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-1 font-medium"
                        title="Đặt lại về tháng này"
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
                  {[
                    { key: 'ALL', label: `Tất cả (${kpiStats.total ?? orders.length})` },
                    { key: 'INBOUND', label: `Lưu kho (${kpiStats.waitingOutbound ?? 0})` },
                    { key: 'CUSTOMER', label: `Xuất khách (${kpiStats.customerOutbound ?? 0})` },
                    { key: 'TRANSFER', label: `Luân chuyển (${kpiStats.transferOutbound ?? 0})` },
                    { key: 'COMPLETED_INBOUND', label: `Đã xuất kho (${kpiStats.completedOutbound ?? kpiStats.completedOutboundToday ?? 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusTab(tab.key)}
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

                {/* Collapse / Expand All Button */}
                {vehicleGroups.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllGroups}
                    className="h-9 text-xs font-semibold border-slate-300 dark:border-slate-700"
                    title={allExpanded ? 'Thu gọn tất cả các nhóm xe' : 'Mở rộng tất cả các nhóm xe'}
                  >
                    {allExpanded ? (
                      <>
                        <IconFoldUp className="mr-1.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
                        Thu gọn tất cả ({vehicleGroups.length} xe)
                      </>
                    ) : (
                      <>
                        <IconFoldDown className="mr-1.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
                        Mở rộng tất cả ({vehicleGroups.length} xe)
                      </>
                    )}
                  </Button>
                )}

                {/* Refresh Metrics Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshMetrics}
                  disabled={isRefreshing}
                  className="h-9 text-xs font-bold border-slate-300"
                >
                  <IconRefresh className={`mr-1.5 h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Cập nhật lại thông số
                </Button>
              </div>

              {/* Batch Action Bar */}
              {selectedOrderIds.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
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
                      onClick={handleBatchConfirmOutbound}
                      disabled={isBatchSubmitting}
                      className="h-7 text-xs font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f]"
                    >
                      {isBatchSubmitting ? (
                        <>
                          <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Đang xuất kho...
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Xác nhận xuất kho {selectedOrderIds.length} đơn
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Outbound Board Table (Frame sq2P6 parity với Inbound) */}
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
                      <th className="p-2.5 text-right w-[140px]">SỐ KIỆN / TẢI TRỌNG</th>
                      <th className="p-2.5 w-[110px] text-center">TRẠNG THÁI</th>
                      <th className="p-2.5 text-center w-[110px]">LOẠI XUẤT KHO</th>
                      <th className="p-2.5 text-center w-[190px]">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Đang tải danh sách đơn xuất kho...
                        </td>
                      </tr>
                    ) : vehicleGroups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          Không có chuyến xe xuất kho phù hợp bộ lọc
                        </td>
                      </tr>
                    ) : (
                      vehicleGroups.map((grp) => {
                        const isExpanded = !!expandedVehicleKeys[grp.groupKey];
                        const groupOrderIds = grp.orders.map((o) => Number(o.id));
                        const isGroupSelected =
                          groupOrderIds.length > 0 &&
                          groupOrderIds.every((id) => selectedOrderIds.includes(id));
                        const canExport = grp.orders.some((o) =>
                          ['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.status),
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
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTripDetail(grp)}
                                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center transition-colors text-left"
                                      title="Nhấp để xem chi tiết chuyến xe (chế độ xem)"
                                    >
                                      <span>{grp.tripCode}</span>
                                      {grp.orders.length > 1 && (
                                        <Badge
                                          variant="outline"
                                          className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 font-bold cursor-pointer"
                                        >
                                          {grp.orders.length} đơn
                                        </Badge>
                                      )}
                                    </button>
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
                                  {grp.isTransfer ? 'Luân chuyển' : 'Xuất khách'}
                                </Badge>
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {canExport && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleExportVehicleTrip(grp)}
                                      className="h-7 text-[11px] font-bold bg-[#0F3D62] text-white hover:bg-[#0c314f] px-2 shadow-xs"
                                      title="Xuất chuyến xe này"
                                    >
                                      <IconTruck className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Xuất chuyến
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenReceiptForVehicle(grp)}
                                    className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 px-2 font-semibold"
                                    title="In phiếu xuất xe (chứa tất cả đơn hàng của xe)"
                                  >
                                    <IconPrinter className="h-3.5 w-3.5 mr-1" /> In phiếu xuất
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
                                <td colSpan={7} className="p-3 pl-10 pr-4">
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
                                          <th className="py-1 px-2 font-medium text-center w-[110px]">CHỨNG TỪ</th>
                                          <th className="py-1 px-2 font-medium min-w-[140px]">GHI CHÚ</th>
                                          <th className="py-1 px-2 font-medium text-center w-[160px]">THAO TÁC</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {grp.orders.map((subOrder) => (
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
                                              {subOrder.goodsDescription || 'Hàng hóa xuất kho'}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                              <div>{subOrder.totalQuantity ?? 1} kiện</div>
                                              <div className="text-gray-400 text-[10px]">
                                                {subOrder.totalWeight?.toLocaleString('vi-VN')} kg &bull; {subOrder.totalVolume} m³
                                              </div>
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                              {renderWarehouseOrderStatusBadge(subOrder.status)}
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                              {subOrder.accompanyingDocs && subOrder.accompanyingDocs.toUpperCase() !== 'KHÔNG CÓ' ? (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-bold text-[10px]"
                                                >
                                                  {subOrder.accompanyingDocs}
                                                </Badge>
                                              ) : (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px]"
                                                >
                                                  {subOrder.accompanyingDocs || 'Không có'}
                                                </Badge>
                                              )}
                                            </td>
                                            <td className="py-1.5 px-2 text-slate-500 text-[11px] truncate max-w-[180px]" title={subOrder.notes}>
                                              {subOrder.notes || '—'}
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePrintOrderReceipt(subOrder)}
                                                className="h-6 text-[10px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2"
                                              >
                                                <IconPrinter className="h-3 w-3 mr-1" /> In phiếu
                                              </Button>
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

              {/* Pagination Bar with Page Size Selector */}
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

      {/* ── View 2: Mode 1 - Xuất Kho (Editable Table + Lookup + Vehicle fields) ── */}
      {activeView === 'MODE1_CUSTOMER' && (
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Tạo Phiếu Xuất Kho</span>
              <Badge className="bg-[#0F3D62] text-white font-mono">Phiếu xuất kho</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Outbound Info Header: 3 Thông tin Xuất kho (Frame UVtv4 parity với Nhập kho) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              {/* 1. Ngày xuất kho */}
              <div>
                <label className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5">
                  1. Ngày xuất kho <span className="text-red-600 font-black">*</span>
                </label>
                <div className="relative">
                  <IconCalendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="h-9 pl-8 text-xs border-red-300 focus:border-red-500 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900 font-medium"
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
                    value={outboundLicensePlate}
                    onChange={(e) => setOutboundLicensePlate(e.target.value)}
                    placeholder="VD: 29C-123.45"
                    className="h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200"
                  />
                </div>
              </div>

              {/* 3. Họ tên người nhận / tài xế */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  3. Họ tên người nhận / tài xế <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <div className="relative">
                  <IconUser className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={outboundDriverName}
                    onChange={(e) => setOutboundDriverName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="h-9 pl-8 text-xs font-medium border-slate-300 focus:border-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700"
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

            <div className="flex justify-between items-center pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setActiveView('BOARD')}>
                Hủy bỏ
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraftMode1}
                  className="text-xs font-bold border-slate-300"
                >
                  Lưu nháp
                </Button>
                <Button
                  onClick={() => handleSubmitOutbound('CUSTOMER')}
                  disabled={isSubmitting}
                  className="bg-[#0F3D62] text-white hover:bg-[#0c314f] px-6 font-bold h-9 text-xs shadow-xs"
                >
                  {isSubmitting ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconCircleCheck className="mr-2 h-4 w-4 text-emerald-400" />
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
        mode="OUTBOUND"
        onOpenReceipt={handleOpenReceiptForVehicle}
      />
      </div>
    </PageContainer>
  );
}

