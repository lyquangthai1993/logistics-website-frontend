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
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';

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

  const fetchKpi = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    fetch('/api/v1/warehouse/kpi', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data) setKpiStats((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  // Customer Mode 1 Form Fields
  const [customerName, setCustomerName] = useState('Công Ty May Mặc Hải Triều');
  const [customerPhone, setCustomerPhone] = useState('0908 123 456');
  const [customerAddress, setCustomerAddress] = useState('123 Điện Biên Phủ, P.15, Q.Bình Thạnh, TP.HCM');
  const [mode1Rows, setMode1Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '',
      pickupAddress: user?.hub?.name || 'Kho xuất hàng',
      goodsDescription: 'Vải may mặc',
      totalQuantity: 20,
      totalWeight: 500,
      totalVolume: 2.0,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '123 Điện Biên Phủ, TP.HCM',
      notes: 'Giao trực tiếp cho khách lẻ',
    },
  ]);

  // Transfer Mode 2 Stepper State
  const [transferHubId, setTransferHubId] = useState<string>('2');
  const [transferLicensePlate, setTransferLicensePlate] = useState('50H-756.14');
  const [transferDriverName, setTransferDriverName] = useState('Nguyễn Hoàng Nam');
  const [mode2Rows, setMode2Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '',
      pickupAddress: user?.hub?.name || 'Kho xuất hàng',
      goodsDescription: 'Hàng gia dụng chuyển Hub',
      totalQuantity: 50,
      totalWeight: 1500,
      totalVolume: 6.0,
      deliveryMode: 'HUB_L1',
      deliveryAddress: 'Magellan Hub - Đà Nẵng',
      notes: 'Chất xe tuyến Bắc - Nam',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Board Orders
  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const query = new URLSearchParams({
      limit: '20',
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
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => setIsLoading(false));
  }, [search, statusTab]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchOrders();
    }
  }, [activeView, fetchOrders]);

  // Refresh Metrics Button Action
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    try {
      if (orderIds.length > 0) {
        await fetch('/api/v1/warehouse/outbound/confirm', {
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
      }

      toast.success(
        mode === 'CUSTOMER'
          ? 'Đã xác nhận xuất kho giao cho khách hàng thành công!'
          : 'Đã lập phiếu xuất luân chuyển và sẵn sàng in Loading Plan!',
      );
      setActiveView('BOARD');
      fetchOrders();
    } catch (err: any) {
      toast.error('Lỗi khi xuất kho: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className="space-y-4 flex-1 w-full min-w-0">
        {/* ── Page Header ── */}
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

      {/* ── View 1: Main Outbound Board ── */}
      {activeView === 'BOARD' && (
        <div className="space-y-4">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-3">
                <span className="text-xs text-gray-500 font-semibold block">Chờ xuất kho</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {kpiStats.waitingOutbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="p-3">
                <span className="text-xs text-gray-500 font-semibold block">Xuất cho khách hàng</span>
                <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                  {kpiStats.storedInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600 shadow-sm">
              <CardContent className="p-3">
                <span className="text-xs text-gray-500 font-semibold block">Luân chuyển nội bộ</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {kpiStats.transferInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-purple-600 shadow-sm">
              <CardContent className="p-3">
                <span className="text-xs text-gray-500 font-semibold block">Đã xuất kho hôm nay</span>
                <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
                  {kpiStats.completedOutboundToday ?? 0} <span className="text-xs font-normal text-gray-500">chuyến</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar with Search, Status Tabs & Refresh Button */}
          <Card className="bg-white dark:bg-slate-900 shadow-sm border">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[280px]">
                  <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm theo mã đơn hoặc tên hàng hóa..."
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
                  {['ALL', 'INBOUND', 'DRAFT', 'COMPLETED_INBOUND'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusTab(tab)}
                      className={`px-3 py-1 rounded-md transition-all ${
                        statusTab === tab
                          ? 'bg-white text-slate-900 shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                          : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                      }`}
                    >
                      {tab === 'ALL'
                        ? 'Tất cả'
                        : tab === 'INBOUND'
                          ? 'LƯU KHO'
                          : tab === 'DRAFT'
                            ? 'DRAFT'
                            : 'ĐÃ XUẤT KHO'}
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
                      <th className="p-2.5 w-[140px]">MÃ ĐƠN HÀNG</th>
                      <th className="p-2.5">KHÁCH HÀNG / ĐÍCH ĐẾN</th>
                      <th className="p-2.5">TÊN HÀNG HÓA</th>
                      <th className="p-2.5 text-right w-[100px]">SỐ KIỆN</th>
                      <th className="p-2.5 text-right w-[110px]">TẢI TRỌNG</th>
                      <th className="p-2.5 text-center w-[120px]">TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          Đang tải dữ liệu xuất kho...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
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
                            {o.totalWeight?.toLocaleString('vi-VN')} kg &bull; {o.totalVolume} m³
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              variant="outline"
                              className={
                                o.status === 'INBOUND'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                  : o.status === 'DRAFT'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                                    : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                              }
                            >
                              {o.status === 'INBOUND' ? 'LƯU KHO' : o.status === 'COMPLETED_INBOUND' ? 'ĐÃ XUẤT KHO' : o.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
              <span>Tạo Phiếu Xuất Kho · Giao Cho Khách Hàng (Mode 1)</span>
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

      {/* ── View 3: Mode 2 - Xuất Luân Chuyển Nội Bộ (Stepper 3 Bước) ── */}
      {activeView === 'MODE2_TRANSFER' && (
        <Card className="bg-white dark:bg-slate-900 shadow-sm border">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Badge className="bg-[#0F3D62] text-white">① Chọn Hub đích & Xe</Badge>
              <span className="text-gray-400">➔</span>
              <Badge className="bg-[#0F3D62] text-white">② Chọn hàng trong kho</Badge>
              <span className="text-gray-400">➔</span>
              <Badge className="bg-slate-200 text-slate-800">③ In Loading Plan & Xuất</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Step 1: Destination Hub & Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-emerald-50/50 dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Hub tiếp nhận (Hub đích) <span className="text-red-500">*</span>
                </label>
                <select
                  value={transferHubId}
                  onChange={(e) => setTransferHubId(e.target.value)}
                  className="w-full h-8 text-xs font-bold rounded border px-2 bg-white dark:bg-slate-900"
                >
                  <option value="2">Magellan Hub - Đà Nẵng (HUB-DAD-01)</option>
                  <option value="1">Polaris Hub - Hưng Yên (HUB-HYN-01)</option>
                  <option value="3">Andromeda Hub - HCM (HUB-HCM-01)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Biển số xe điều chuyển <span className="text-red-500">*</span>
                </label>
                <Input
                  value={transferLicensePlate}
                  onChange={(e) => setTransferLicensePlate(e.target.value)}
                  className="h-8 text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Họ tên tài xế xe tuyến <span className="text-red-500">*</span>
                </label>
                <Input
                  value={transferDriverName}
                  onChange={(e) => setTransferDriverName(e.target.value)}
                  className="h-8 text-xs font-bold"
                />
              </div>
            </div>

            {/* Step 2: Editable Table to pick stored items */}
            <WarehouseEditableGrid
              rows={mode2Rows}
              onChange={setMode2Rows}
              isOutboundMode={true}
              onRefreshMetrics={handleRefreshMetrics}
              isLoadingMetrics={isRefreshing}
            />

            {/* Step 3 Actions */}
            <div className="flex justify-between items-center pt-3 border-t">
              <Button variant="outline" onClick={() => setActiveView('BOARD')}>
                Hủy bỏ
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs font-semibold"
                >
                  <IconPrinter className="mr-1.5 h-4 w-4" /> In Loading Plan (A4 Ngang)
                </Button>
                <Button
                  onClick={() => handleSubmitOutbound('TRANSFER')}
                  disabled={isSubmitting}
                  className="bg-emerald-700 text-white hover:bg-emerald-800 px-6 font-bold"
                >
                  {isSubmitting ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconCircleCheck className="mr-2 h-5 w-5 text-emerald-300" />
                  )}
                  Xác nhận xuất kho luân chuyển
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </PageContainer>
  );
}
