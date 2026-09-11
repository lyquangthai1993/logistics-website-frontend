'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    const orderIds = activeRows
      .map((r) => Number(r.id))
      .filter((id) => !isNaN(id) && id > 0);

    setIsSubmitting(true);
    const token = tokenManager.getAccessToken();

    try {
      if (orderIds.length > 0) {
        const res = await fetch('/api/v1/warehouse/outbound/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            orderIds,
            mode,
            customerName: mode === 'CUSTOMER' ? customerName : undefined,
            customerPhone: mode === 'CUSTOMER' ? customerPhone : undefined,
            deliveryAddress: mode === 'CUSTOMER' ? customerAddress : undefined,
            destinationHubId: mode === 'TRANSFER' ? parseInt(transferHubId, 10) : undefined,
            licensePlate: mode === 'TRANSFER' ? transferLicensePlate : undefined,
            driverName: mode === 'TRANSFER' ? transferDriverName : undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: res.statusText }));
          throw { response: { data: errData, status: res.status } };
        }
      }

      toast.success(
        mode === 'CUSTOMER'
          ? 'Đã xác nhận xuất kho giao cho khách hàng thành công!'
          : 'Đã lập phiếu xuất luân chuyển và sẵn sàng in Loading Plan!',
      );
      setActiveView('BOARD');
      fetchKpi();
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Lỗi khi xuất kho');
    } finally {
      setIsSubmitting(false);
    }
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
                  <IconPlus className="mr-1 h-4 w-4" /> Xuất cho khách hàng
                </Button>
                <Button
                  onClick={() => setActiveView('MODE2_TRANSFER')}
                  className="bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold"
                >
                  <IconTruck className="mr-1 h-4 w-4" /> Xuất luân chuyển nội bộ
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

      {/* ── View 1: Main Outbound Board ── */}
      {activeView === 'BOARD' && (
        <div className="space-y-4">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] text-gray-500 font-bold tracking-wider block">CHỜ XUẤT KHO</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {kpiStats.waitingOutbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Đơn hàng lưu kho sẵn sàng xuất bến</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] text-gray-500 font-bold tracking-wider block">XUẤT CHO KHÁCH HÀNG</span>
                <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                  {kpiStats.customerOutbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Giao thẳng tới khách hàng cuối</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-slate-700 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] text-gray-500 font-bold tracking-wider block">LUÂN CHUYỂN NỘI BỘ</span>
                <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                  {kpiStats.transferOutbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Chuyển tiếp qua Hub vệ tinh khác</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-purple-600 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] text-gray-500 font-bold tracking-wider block">ĐÃ XUẤT KHO</span>
                <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
                  {kpiStats.completedOutbound ?? kpiStats.completedOutboundToday ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Đã xuất kho & bàn giao thành công</p>
              </CardContent>
            </Card>
          </div>

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
                      placeholder="Tìm kiếm theo mã đơn hoặc tên hàng hóa..."
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  {/* Date Range: Từ ngày -> Đến ngày (Default: Đầu tháng -> Hôm nay) */}
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

              {/* Table List */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                    <tr>
                      <th className="p-2.5 w-[180px]">MÃ ĐƠN HÀNG</th>
                      <th className="p-2.5">KHÁCH HÀNG / ĐÍCH ĐẾN</th>
                      <th className="p-2.5">TÊN HÀNG HÓA</th>
                      <th className="p-2.5 text-right w-[90px]">SỐ KIỆN</th>
                      <th className="p-2.5 text-right w-[100px]">SỐ KG</th>
                      <th className="p-2.5 text-right w-[90px]">SỐ M³</th>
                      <th className="p-2.5 text-center w-[120px]">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Đang tải dữ liệu xuất kho...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          Chưa có đơn hàng nào trong danh sách xuất kho
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-blue-600">{o.orderCode}</td>
                          <td className="p-2.5 font-medium">{o.destinationHub || o.route || 'Giao khách lẻ'}</td>
                          <td className="p-2.5">{o.goodsDescription || 'Hàng tổng quan'}</td>
                          <td className="p-2.5 text-right font-bold">{o.totalQuantity ?? 1}</td>
                          <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                            {o.totalWeight ? `${o.totalWeight.toLocaleString('vi-VN')} kg` : '0 kg'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                            {o.totalVolume ? `${o.totalVolume} m³` : '0 m³'}
                          </td>
                          <td className="p-2.5 text-center">
                            {renderWarehouseOrderStatusBadge(o.status)}
                          </td>
                        </tr>
                      ))
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

      {/* ── View 2: Mode 1 - Xuất Cho Khách Hàng (Editable Table + Lookup) ── */}
      {activeView === 'MODE1_CUSTOMER' && (
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Tạo Phiếu Xuất Kho · Giao Cho Khách Hàng</span>
              <Badge className="bg-blue-100 text-blue-800 font-mono">Phiếu xuất trực tiếp</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Customer Info Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Khách hàng / Người nhận <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Số điện thoại người nhận <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Địa chỉ giao hàng <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
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
              <Button variant="outline" onClick={() => setActiveView('BOARD')}>
                Hủy bỏ
              </Button>
              <Button
                onClick={() => handleSubmitOutbound('CUSTOMER')}
                disabled={isSubmitting}
                className="bg-[#0F3D62] text-white hover:bg-[#0c314f] px-6 font-bold"
              >
                {isSubmitting ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconCircleCheck className="mr-2 h-5 w-5 text-emerald-400" />
                )}
                Xác nhận xuất kho cho khách hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── View 3: Mode 2 - Xuất Luân Chuyển Nội Bộ (WH_OUTBOUND_CREATE_TRIP -> WH_OUTBOUND_SELECT_MODAL -> WH_OUTBOUND_LOADED) ── */}
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
      </div>
    </PageContainer>
  );
}
