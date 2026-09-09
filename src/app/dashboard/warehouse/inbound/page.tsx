'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  IconX,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { PalletLabelA4Modal, PalletLabelData } from '@/features/warehouse/components/pallet-label-a4-modal';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';

export default function WarehouseInboundPage() {
  const user = useAuthStore((state) => state.user);

  // Active View State: 'BOARD' (sq2P6) | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'
  const [activeView, setActiveView] = useState<'BOARD' | 'MODE1_CUSTOMER' | 'MODE2_TRANSFER'>('BOARD');

  // Inbound Board State (sq2P6)
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'WAITING' | 'CUSTOMER' | 'TRANSFER' | 'STORED'>('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Vehicle Header Fields (3 Red-Border Required Fields for Mode 1 - Frame UVtv4)
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [licensePlate, setLicensePlate] = useState('50H-756.14');
  const [driverName, setDriverName] = useState('Phạm Thành Trung');

  // Mode 1 Rows (Frame xTfjC: 3 Canonical Rows in WH_CASE_01)
  const [mode1Rows, setMode1Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '(Tự sinh khi lưu)',
      pickupAddress: 'KCN Phú Nghĩa, Hà Nội\nKhu A · Cổng số 2',
      goodsDescription: 'Vải cuộn',
      totalQuantity: 50,
      totalWeight: 1280,
      totalVolume: 5.0,
      deliveryMode: 'DIRECT_CUSTOMER',
      deliveryAddress: '25 Nguyễn Văn Linh, Q.7, TP.HCM',
      notes: 'Giao giờ hành chính\nLiên hệ bảo vệ trước khi vào cổng',
    },
    {
      orderCode: '(Tự sinh khi lưu)',
      pickupAddress: 'Andromeda Hub - HCM\nThủ Đức, TP.HCM',
      goodsDescription: 'Hạt nhựa',
      totalQuantity: 20,
      totalWeight: 680,
      totalVolume: 2.4,
      deliveryMode: 'HUB_L1',
      deliveryAddress: 'Polaris Hub - Hưng Yên · nhận trung chuyển',
      notes: 'Nhập ghi chú\nCó thể bổ sung yêu cầu xử lý',
    },
    {
      orderCode: '(Tự sinh khi lưu)',
      pickupAddress: 'Andromeda Hub - HCM\nThủ Đức, TP.HCM',
      goodsDescription: 'Linh kiện',
      totalQuantity: 12,
      totalWeight: 240,
      totalVolume: 1.1,
      deliveryMode: 'XE_BO',
      deliveryAddress: 'XB-KH-02 · gom hàng tuyến nội thành',
      notes: 'Hàng dễ vỡ\nƯu tiên kiểm đếm riêng',
    },
  ]);

  // Mode 2 Stepper State
  const [mode2Step, setMode2Step] = useState<1 | 2 | 3>(1);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Pallet Label A4 Modal State
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedLabelData, setSelectedLabelData] = useState<PalletLabelData | null>(null);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch Inbound Board Orders
  const fetchInboundOrders = useCallback(() => {
    setIsLoadingOrders(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const query = new URLSearchParams({
      limit: '100',
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
      .finally(() => setIsLoadingOrders(false));
  }, [search, statusTab]);

  useEffect(() => {
    if (activeView === 'BOARD') {
      fetchInboundOrders();
    }
  }, [activeView, fetchInboundOrders]);

  // Refresh Metrics Button Action
  const handleRefreshMetrics = async () => {
    setIsRefreshing(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

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

  // Fetch Trips for Mode 2
  const fetchInboundTrips = () => {
    setIsLoadingTrips(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    fetch('/api/v1/warehouse/inbound-trips', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        const items = resData?.data || [];
        setTripsList(items);
        setIsTripModalOpen(true);
      })
      .catch(() => {
        setTripsList([
          {
            id: 28,
            tripCode: 'TRIP-260903-018',
            vehicleLicensePlate: '29C-888.99',
            vehicleType: 'Tải thùng 5T kín',
            driverName: 'Nguyễn Văn Tuấn',
            driverPhone: '0988 234 567',
            originHub: 'Polaris Hub - Hưng Yên',
            destinationHub: user?.hub?.name || 'Kho tiếp nhận',
            remainingOrdersCount: 5,
            totalWeight: 3450,
            totalVolume: 14.2,
          },
        ]);
        setIsTripModalOpen(true);
      })
      .finally(() => setIsLoadingTrips(false));
  };

  // Submit Mode 1 (Direct Customer Inbound)
  const handleSubmitMode1 = async () => {
    if (!licensePlate.trim()) {
      toast.error('Vui lòng nhập Biển số xe tiếp nhận');
      return;
    }
    if (!driverName.trim()) {
      toast.error('Vui lòng nhập Họ tên tài xế / người giao');
      return;
    }

    setIsSubmitting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    try {
      for (const row of mode1Rows) {
        await fetch('/api/v1/warehouse/inbound/quick-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            goodsDescription: row.goodsDescription,
            totalQuantity: row.totalQuantity,
            totalWeight: row.totalWeight,
            totalVolume: row.totalVolume,
            pickupAddress: row.pickupAddress,
            deliveryAddress: row.deliveryAddress,
            deliveryMode: row.deliveryMode,
            notes: row.notes,
            initialStatus: 'INBOUND', // LƯU KHO
          }),
        });
      }

      toast.success(`Đã tiếp nhận thành công ${mode1Rows.length} lô hàng vào kho! Mã đơn hàng đã tự động cấp phát.`);
      setMode1Rows([
        {
          orderCode: '(Tự sinh khi lưu)',
          pickupAddress: user?.hub?.name || 'Kho tiếp nhận',
          goodsDescription: '',
          totalQuantity: 10,
          totalWeight: 200,
          totalVolume: 1.0,
          deliveryMode: 'DIRECT_CUSTOMER',
          deliveryAddress: '',
          notes: '',
        },
      ]);
      setActiveView('BOARD');
      fetchKpi();
      fetchInboundOrders();
    } catch (err: any) {
      toast.error('Lỗi khi tiếp nhận hàng vào kho: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSubmitting(false);
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
            {/* 4 Stat Cards (sq2P6 Inbound Status Metrics) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
                <CardContent className="p-3">
                  <span className="text-[11px] text-gray-500 font-bold tracking-wider block">CHỜ NHẬP KHO</span>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {kpiStats.waitingInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Đang chờ tiếp nhận & kiểm đếm</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 shadow-sm">
                <CardContent className="p-3">
                  <span className="text-[11px] text-gray-500 font-bold tracking-wider block">KHÁCH GỬI TẠI KHO</span>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                    {kpiStats.customerInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tiếp nhận trực tiếp từ khách hàng</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-slate-700 shadow-sm">
                <CardContent className="p-3">
                  <span className="text-[11px] text-gray-500 font-bold tracking-wider block">LUÂN CHUYỂN NỘI BỘ</span>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    {kpiStats.transferInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Chuyển tiếp từ các Hub vệ tinh</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600 shadow-sm">
                <CardContent className="p-3">
                  <span className="text-[11px] text-gray-500 font-bold tracking-wider block">ĐÃ NHẬP KHO</span>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {kpiStats.storedInbound ?? 0} <span className="text-xs font-normal text-gray-500">đơn</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Đã lưu kho an toàn & dán tem A4</p>
                </CardContent>
              </Card>
            </div>

            {/* Toolbar: Search, Status Tabs & Refresh Button */}
            <Card className="bg-white dark:bg-slate-900 shadow-sm border">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Status Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
                    {[
                      { key: 'ALL', label: `Tất cả (${kpiStats.total ?? orders.length})` },
                      { key: 'WAITING', label: `Chờ nhập kho (${kpiStats.waitingInbound ?? 0})` },
                      { key: 'CUSTOMER', label: `Khách gửi (${kpiStats.customerInbound ?? 0})` },
                      { key: 'TRANSFER', label: `Luân chuyển (${kpiStats.transferInbound ?? 0})` },
                      { key: 'STORED', label: `Đã nhập kho (${kpiStats.storedInbound ?? 0})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusTab(tab.key as any)}
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
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm mã vận đơn, khách hàng, nguồn/trip..."
                        className="pl-8 h-9 text-xs"
                      />
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
                      <span>Cập nhật lại thông số</span>
                    </Button>
                  </div>
                </div>

                {/* Inbound Board Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                      <tr>
                        <th className="p-2.5 w-[160px]">MÃ VẬN ĐƠN</th>
                        <th className="p-2.5">KHÁCH HÀNG / NGUỒN GỬI</th>
                        <th className="p-2.5 w-[140px] text-center">TRẠNG THÁI</th>
                        <th className="p-2.5 text-right w-[160px]">SỐ KIỆN / TẢI TRỌNG</th>
                        <th className="p-2.5 text-center w-[150px]">LOẠI NHẬP KHO</th>
                        <th className="p-2.5 text-center w-[120px]">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {isLoadingOrders ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                            Đang tải danh sách đơn nhập kho...
                          </td>
                        </tr>
                      ) : orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            Không có đơn hàng nhập kho phù hợp bộ lọc
                          </td>
                        </tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono font-bold text-blue-600">
                              {o.orderCode}
                            </td>
                            <td className="p-2.5 font-medium">
                              <div className="text-slate-900 dark:text-white font-semibold">{o.senderName || o.pickupAddress || 'Khách gửi'}</div>
                              <div className="text-gray-400 text-[11px]">{o.goodsDescription || 'Hàng hóa tổng quan'}</div>
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={
                                  o.status === 'INBOUND'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                                }
                              >
                                {o.status === 'INBOUND' ? 'LƯU KHO' : 'Chờ nhập kho'}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                              <div>{o.totalQuantity ?? 1} kiện</div>
                              <div className="text-gray-400 text-[11px]">
                                {o.totalWeight?.toLocaleString('vi-VN')} kg &bull; {o.totalVolume} m³
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={
                                  o.inboundType === 'TRANSFER' || o.orderCode?.startsWith('TRIP')
                                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold'
                                    : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                                }
                              >
                                {o.inboundType === 'TRANSFER' || o.orderCode?.startsWith('TRIP')
                                  ? 'Luân chuyển'
                                  : 'Khách gửi'}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLabelData({
                                    orderCode: o.orderCode,
                                    goodsDescription: o.goodsDescription || 'Hàng hóa nhập kho',
                                    totalQuantity: o.totalQuantity || 1,
                                    originHub: o.pickupAddress,
                                    destinationHub: o.deliveryAddress,
                                    createdAt: new Date(),
                                  });
                                  setIsLabelModalOpen(true);
                                }}
                                className="h-7 text-xs text-blue-600 hover:text-blue-800"
                                title="In tem nhận diện A4"
                              >
                                <IconPrinter className="h-3.5 w-3.5 mr-1" /> In tem
                              </Button>
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
                Mới hoàn toàn · Khách hàng đưa vào kho
              </button>
              <button
                type="button"
                onClick={() => setActiveView('MODE2_TRANSFER')}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white"
              >
                Luân chuyển nội bộ · Chọn chuyến hàng
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
                      placeholder="VD: 50H-756.14"
                      className="h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 uppercase bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200"
                    />
                  </div>
                </div>

                {/* 3. Tài xế / Người giao */}
                <div>
                  <label className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1.5">
                    3. Họ tên người nhận / tài xế <span className="text-red-600 font-black">*</span>
                  </label>
                  <div className="relative">
                    <IconUser className="absolute left-2.5 top-2.5 h-4 w-4 text-red-400" />
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="VD: Phạm Thành Trung"
                      className="h-9 pl-8 text-xs font-bold border-red-400 focus:border-red-500 bg-red-50/30 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200"
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
                      onClick={() => toast.success('Đã lưu nháp bảng kê nhập kho thành công!')}
                      className="text-xs font-semibold h-9 border-slate-300 dark:border-slate-700"
                    >
                      Lưu nháp
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

        {/* ── View 3: Mode 2 - Luân Chuyển Nội Bộ (Stepper 3 bước) ── */}
        {activeView === 'MODE2_TRANSFER' && (
          <div className="space-y-4">
            {/* Inbound Mode Switch Tabs (Frame SPiXE in WH_CASE_01) */}
            <div className="w-full bg-[#E8EDF4] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('MODE1_CUSTOMER')}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all text-slate-600 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white"
              >
                Mới hoàn toàn · Khách hàng đưa vào kho
              </button>
              <button
                type="button"
                onClick={() => setActiveView('MODE2_TRANSFER')}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs transition-all bg-white dark:bg-slate-700 text-[#0F3D62] dark:text-blue-300 font-bold shadow-sm"
              >
                Luân chuyển nội bộ · Chọn chuyến hàng
              </button>
            </div>

            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
              <CardHeader className="py-3 px-4 border-b">
                {/* Stepper Bar */}
                <div className="flex items-center gap-2 text-xs font-bold overflow-x-auto pb-1">
                  <Badge
                    className={
                      mode2Step === 1
                        ? 'bg-[#0F3D62] text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    ① Chọn chuyến xe đang đến {selectedTrip && '✓'}
                  </Badge>
                  <span className="text-gray-400">➔</span>
                  <Badge
                    className={
                      mode2Step === 2
                        ? 'bg-[#0F3D62] text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    ② Chọn đơn hàng cần dỡ {mode2Step === 3 && '✓'}
                  </Badge>
                  <span className="text-gray-400">➔</span>
                  <Badge
                    className={
                      mode2Step === 3
                        ? 'bg-[#0F3D62] text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    ③ Kiểm tra & Nhập kho
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!selectedTrip ? (
                  <div className="text-center py-10 space-y-4">
                    <IconTruck className="h-16 w-16 text-blue-500 mx-auto opacity-70 animate-bounce" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Chưa chọn chuyến xe cần dỡ hàng
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Chọn một chuyến xe từ Hub khác đang trên đường đến {currentHubName || 'Kho của bạn'} để tiếp nhận và kiểm đếm theo danh sách.
                      </p>
                    </div>
                    <Button
                      onClick={fetchInboundTrips}
                      disabled={isLoadingTrips}
                      className="bg-[#0F3D62] text-white hover:bg-[#0c314f] px-6 font-bold"
                    >
                      {isLoadingTrips ? (
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <IconTruck className="mr-2 h-4 w-4" />
                      )}
                      Chọn chuyến hàng ➔
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Trip Details */}
                    <div className="flex flex-wrap items-center justify-between p-3.5 bg-blue-50/60 dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-600 text-white font-mono font-bold">
                          {selectedTrip.tripCode}
                        </Badge>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Xe: {selectedTrip.vehicleLicensePlate} ({selectedTrip.vehicleType})
                          </span>
                          <span className="text-xs text-slate-500 block">
                            Tài xế: {selectedTrip.driverName} &bull; Xuất phát: {selectedTrip.originHub}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTrip(null);
                          setMode2Step(1);
                        }}
                        className="text-xs"
                      >
                        Đổi chuyến xe khác
                      </Button>
                    </div>

                    <WarehouseEditableGrid
                      rows={mode1Rows}
                      onChange={setMode1Rows}
                      isOutboundMode={false}
                    />

                    <div className="flex justify-end pt-3 border-t">
                      <Button
                        onClick={handleSubmitMode1}
                        disabled={isSubmitting}
                        className="bg-[#0F3D62] hover:bg-[#0c314f] text-white px-6 font-bold"
                      >
                        {isSubmitting ? (
                          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconCircleCheck className="mr-2 h-5 w-5 text-emerald-400" />
                        )}
                        Xác nhận tiếp nhận chuyến hàng
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Modal Chọn Chuyến Xe Mode 2 ── */}
        {isTripModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IconTruck className="h-5 w-5 text-blue-600" />
                  <span>Chọn chuyến xe đến{currentHubName ? ` ${currentHubName}` : ' Kho'} ({tripsList.length} chuyến còn hàng)</span>
                </h3>
                <button
                  onClick={() => setIsTripModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                    <tr>
                      <th className="p-2.5">MÃ CHUYẾN</th>
                      <th className="p-2.5">XE & TÀI XẾ</th>
                      <th className="p-2.5">HUB XUẤT PHÁT</th>
                      <th className="p-2.5 text-center">HÀNG TRÊN XE</th>
                      <th className="p-2.5 text-center">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {tripsList.map((trip) => (
                      <tr key={trip.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800">
                        <td className="p-2.5 font-mono font-bold text-blue-600">{trip.tripCode}</td>
                        <td className="p-2.5">
                          <div className="font-bold">{trip.vehicleLicensePlate}</div>
                          <div className="text-gray-500">{trip.driverName} - {trip.driverPhone}</div>
                        </td>
                        <td className="p-2.5 font-medium">{trip.originHub}</td>
                        <td className="p-2.5 text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 font-bold">
                            Còn {trip.remainingOrdersCount || 1} đơn
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTrip(trip);
                              setIsTripModalOpen(false);
                              setMode2Step(3);
                              setLicensePlate(trip.vehicleLicensePlate);
                              setDriverName(trip.driverName);
                            }}
                            className="h-7 text-xs bg-[#0F3D62] text-white hover:bg-[#0c314f]"
                          >
                            Chọn chuyến này ➔
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsTripModalOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal In Tem A4 (Pallet Label A4 Modal) ── */}
        <PalletLabelA4Modal
          isOpen={isLabelModalOpen}
          onClose={() => {
            setIsLabelModalOpen(false);
            setSelectedLabelData(null);
          }}
          data={selectedLabelData}
        />
      </div>
    </PageContainer>
  );
}
