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
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { WarehouseOutboundTransferFlow } from '@/features/warehouse/components/warehouse-outbound-transfer-flow';
import { WarehouseOutboundReceiptModal, OutboundReceiptData } from '@/features/warehouse/components/warehouse-outbound-receipt-modal';
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
    toast.success('Đã lưu nháp phiếu xuất kho thành công!');
    setActiveView('BOARD');
  };

  // Group orders by vehicle license plate (Feedback 17/8: group_theo_xe.png)
  interface VehicleGroup {
    licensePlate: string;
    driverName?: string;
    orders: any[];
    totalPackages: number;
    totalWeight: number;
    totalVolume: number;
    canExport: boolean;
  }

  const vehicleGroups: VehicleGroup[] = useMemo(() => {
    const map = new Map<string, VehicleGroup>();

    for (const o of orders) {
      const trip = o.trips?.[0];
      const plate = trip?.licensePlate?.trim() || o.vehicleLicensePlate?.trim() || 'CHƯA GÁN XE';
      const driver = trip?.driverName?.trim() || o.driverName?.trim() || '';

      if (!map.has(plate)) {
        map.set(plate, {
          licensePlate: plate,
          driverName: driver,
          orders: [],
          totalPackages: 0,
          totalWeight: 0,
          totalVolume: 0,
          canExport: false,
        });
      }

      const group = map.get(plate)!;
      group.orders.push(o);
      group.totalPackages += Number(o.totalQuantity) || 0;
      group.totalWeight += Number(o.totalWeight) || 0;
      group.totalVolume += Number(o.totalVolume) || 0;
      if (['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.status)) {
        group.canExport = true;
      }
    }

    return Array.from(map.values());
  }, [orders]);

  // Quick export for an entire vehicle trip
  const handleExportVehicleTrip = async (group: VehicleGroup) => {
    const exportableOrders = group.orders.filter((o) =>
      ['INBOUND', 'WAITING_OUTBOUND', 'CONFIRMED', 'COLLECTED'].includes(o.status)
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
          mode: 'CUSTOMER',
          licensePlate: group.licensePlate !== 'CHƯA GÁN XE' ? group.licensePlate : undefined,
          driverName: group.driverName || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: errData, status: res.status } };
      }

      toast.success(`Đã xuất kho chuyến xe ${group.licensePlate} (${exportableOrders.length} đơn)!`);
      fetchKpi();
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất chuyến xe');
    }
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

              {/* Vehicle-grouped Table List (feedback_17_8: group_theo_xe.png) */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="border rounded-lg p-10 text-center text-gray-500 bg-white dark:bg-slate-900">
                    <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải dữ liệu xuất kho...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="border rounded-lg p-10 text-center text-gray-400 bg-white dark:bg-slate-900">
                    Chưa có đơn hàng nào trong danh sách xuất kho
                  </div>
                ) : (
                  vehicleGroups.map((group) => (
                    <div
                      key={group.licensePlate}
                      className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs"
                    >
                      {/* Vehicle Header */}
                      <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100 text-xs">
                            <IconTruck className="h-4 w-4 text-[#0F3D62] dark:text-blue-400" />
                            <span>
                              Biển số xe:{' '}
                              <span className="font-mono text-[#0F3D62] dark:text-blue-400 font-bold">
                                {group.licensePlate}
                              </span>
                            </span>
                          </div>
                          {group.driverName && (
                            <span className="text-xs text-slate-500 font-medium">
                              Tài xế:{' '}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {group.driverName}
                              </span>
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          >
                            {group.orders.length} đơn hàng · {group.totalPackages} kiện ·{' '}
                            {group.totalWeight ? `${group.totalWeight.toLocaleString('vi-VN')} kg` : '0 kg'}
                          </Badge>
                        </div>

                        {group.canExport && (
                          <Button
                            size="sm"
                            onClick={() => handleExportVehicleTrip(group)}
                            className="bg-[#0F3D62] text-white hover:bg-[#0c314f] h-7 text-xs font-bold px-3 shadow-xs"
                          >
                            Xuất chuyến xe này
                          </Button>
                        )}
                      </div>

                      {/* Vehicle Orders Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-bold border-b text-[11px]">
                            <tr>
                              <th className="py-1.5 px-2 w-[160px]">MÃ ĐƠN HÀNG</th>
                              <th className="py-1.5 px-2">KHÁCH HÀNG / ĐÍCH ĐẾN</th>
                              <th className="py-1.5 px-2">TÊN HÀNG HÓA</th>
                              <th className="py-1.5 px-2 w-[140px]">CHUYẾN XE / TRIP</th>
                              <th className="py-1.5 px-2 text-right w-[90px]">TỒN KHO</th>
                              <th className="py-1.5 px-2 text-right w-[80px]">SỐ KIỆN</th>
                              <th className="py-1.5 px-2 text-right w-[90px]">SỐ KG</th>
                              <th className="py-1.5 px-2 text-right w-[80px]">SỐ M³</th>
                              <th className="py-1.5 px-2 text-center w-[110px]">TRẠNG THÁI</th>
                              <th className="py-1.5 px-2 text-center w-[90px]">THAO TÁC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {group.orders.map((o) => (
                              <tr
                                key={o.id}
                                className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-1.5 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {o.orderCode}
                                </td>
                                <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                  {o.destinationHub || o.route || o.deliveryAddress || 'Giao khách lẻ'}
                                </td>
                                <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">
                                  {o.goodsDescription || 'Hàng tổng quan'}
                                </td>
                                <td className="py-1.5 px-2">
                                  {(() => {
                                    const activeTrip = o.trips?.[0];
                                    const tripCode =
                                      activeTrip?.tripCode ||
                                      (activeTrip?.id ? `TRIP-${activeTrip.id}` : null);
                                    const plate = activeTrip?.licensePlate || o.vehicleLicensePlate;
                                    const driver = activeTrip?.driverName || o.driverName;

                                    if (!tripCode && !plate) {
                                      return <span className="text-gray-400 italic text-[11px]">—</span>;
                                    }

                                    return (
                                      <div className="text-xs space-y-0.5">
                                        {tripCode && (
                                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center gap-1">
                                            <span>{tripCode}</span>
                                            {o.trips && o.trips.length > 1 && (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50"
                                              >
                                                +{o.trips.length - 1}
                                              </Badge>
                                            )}
                                          </div>
                                        )}
                                        {plate && (
                                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1">
                                            <IconTruck className="h-3 w-3 text-slate-400 shrink-0" />
                                            <span>{plate}</span>
                                          </div>
                                        )}
                                        {driver && (
                                          <div
                                            className="text-[10px] text-gray-400 truncate max-w-[120px]"
                                            title={driver}
                                          >
                                            {driver}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-1.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {o.remainingQuantity ?? o.totalQuantity ?? 0} kiện
                                </td>
                                <td className="py-1.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                                  {o.totalQuantity ?? 1}
                                </td>
                                <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                  {o.totalWeight ? `${o.totalWeight.toLocaleString('vi-VN')} kg` : '0 kg'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                                  {o.totalVolume ? `${o.totalVolume} m³` : '0 m³'}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  {renderWarehouseOrderStatusBadge(o.status)}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePrintOrderReceipt(o)}
                                    className="h-6 px-2 text-[11px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-slate-800"
                                    title="In phiếu xuất kho"
                                  >
                                    <IconPrinter className="h-3.5 w-3.5 mr-1" /> In phiếu
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
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
            {/* Vehicle & Customer Info Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Biển số xe giao hàng / trung chuyển
                </label>
                <Input
                  value={outboundLicensePlate}
                  onChange={(e) => setOutboundLicensePlate(e.target.value)}
                  placeholder="Ví dụ: 29C-123.45"
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tài xế giao hàng
                </label>
                <Input
                  value={outboundDriverName}
                  onChange={(e) => setOutboundDriverName(e.target.value)}
                  placeholder="Họ tên tài xế"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ngày xuất kho
                </label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Khách hàng / Người nhận
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên người nhận (nếu giao khách lẻ)"
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Số điện thoại người nhận
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Địa chỉ giao hàng / Hub nhận
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Địa chỉ giao hoặc ghi chú đích đến"
                  className="h-8 text-xs"
                />
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
      </div>
    </PageContainer>
  );
}
