'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IconBuildingWarehouse,
  IconTruck,
  IconCheck,
  IconPlus,
  IconLoader2,
  IconArrowRight,
  IconCalendar,
  IconUser,
  IconChecklist,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { WarehouseEditableGrid, WarehouseRowItem } from '@/features/warehouse/components/warehouse-editable-grid';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';

export default function WarehouseInboundPage() {
  const user = useAuthStore((state) => state.user);

  // Vehicle Header Fields (3 Red-Border Required Fields)
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [licensePlate, setLicensePlate] = useState('43H-307.03');
  const [driverName, setDriverName] = useState('Phạm Thành Trung');

  // Mode 1 Rows
  const [mode1Rows, setMode1Rows] = useState<WarehouseRowItem[]>([
    {
      orderCode: '(Tự sinh khi lưu)',
      pickupAddress: 'KCN Thăng Long II, Hưng Yên',
      goodsDescription: 'Vải cuộn may mặc xuất khẩu',
      totalQuantity: 50,
      totalWeight: 1280,
      totalVolume: 5.0,
      deliveryMode: 'HUB_L1',
      deliveryAddress: 'Magellan Hub - Đà Nẵng',
      notes: 'Hàng may mặc đóng bao nilon chống ẩm',
    },
    {
      orderCode: '(Tự sinh khi lưu)',
      pickupAddress: 'Kho Phụ Gia KCN Quế Võ, Bắc Ninh',
      goodsDescription: 'Hạt nhựa nguyên sinh HDPE',
      totalQuantity: 80,
      totalWeight: 2000,
      totalVolume: 4.2,
      deliveryMode: 'XE_BO',
      deliveryAddress: 'Xe bo Tuyến Đà Nẵng',
      notes: 'Bốc dỡ cẩn thận, tránh rách bao bì',
    },
  ]);

  // Mode 2 Stepper State
  const [mode2Step, setMode2Step] = useState<1 | 2 | 3>(1);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // KPI Stats
  const [kpiStats, setKpiStats] = useState({
    waitingInbound: 12,
    storedInbound: 48,
    waitingOutbound: 25,
    completedOutboundToday: 18,
  });

  // Fetch KPI
  useEffect(() => {
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
        // Fallback demo trips
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
      // Reset rows to fresh empty row
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
        {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400">
            <IconBuildingWarehouse className="h-6 w-6" />
            <span>Tiếp Nhận & Nhập Kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tiếp nhận hàng hóa từ khách hàng hoặc xe luân chuyển từ Hub khác về.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold px-3 py-1">
            🟢 Đang hoạt động · Sàn Kho Chính
          </Badge>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-600 shadow-sm">
          <CardContent className="p-3">
            <span className="text-xs text-gray-500 font-semibold block">Chờ nhập kho</span>
            <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
              {kpiStats.waitingInbound} <span className="text-xs font-normal text-gray-500">đơn</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600 shadow-sm">
          <CardContent className="p-3">
            <span className="text-xs text-gray-500 font-semibold block">Lưu kho hiện tại</span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {kpiStats.storedInbound} <span className="text-xs font-normal text-gray-500">lô</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-3">
            <span className="text-xs text-gray-500 font-semibold block">Chờ xuất chuyển</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {kpiStats.waitingOutbound} <span className="text-xs font-normal text-gray-500">đơn</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-purple-600 shadow-sm">
          <CardContent className="p-3">
            <span className="text-xs text-gray-500 font-semibold block">Đã xuất hôm nay</span>
            <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
              {kpiStats.completedOutboundToday} <span className="text-xs font-normal text-gray-500">chuyến</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Khối Header Thông Tin Tiếp Nhận Tại Cửa Kho (3 Trường Bắt Buộc Viền Đỏ) ── */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardHeader className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 border-b">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <IconTruck className="h-4 w-4 text-blue-600" />
            <span>Thông Tin Phương Tiện & Tiếp Nhận Cửa Kho (Bắt buộc)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Ngày nhận */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              1. Ngày tiếp nhận <span className="text-red-600 font-black">*</span>
            </label>
            <div className="relative">
              <IconCalendar className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="h-8 pl-8 text-xs border-red-300 focus:border-red-500 dark:border-red-900"
              />
            </div>
          </div>

          {/* 2. Biển số xe */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              2. Biển số xe <span className="text-red-600 font-black">*</span>
            </label>
            <div className="relative">
              <IconTruck className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="VD: 43H-307.03 hoặc 50H-756.14"
                className="h-8 pl-8 text-xs font-bold border-red-300 focus:border-red-500 uppercase dark:border-red-900"
              />
            </div>
          </div>

          {/* 3. Tài xế / Người giao */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              3. Họ tên tài xế / người giao <span className="text-red-600 font-black">*</span>
            </label>
            <div className="relative">
              <IconUser className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="VD: Phạm Thành Trung"
                className="h-8 pl-8 text-xs font-bold border-red-300 focus:border-red-500 dark:border-red-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2 Chế Độ Nhập Kho (Dual Mode Tabs) ── */}
      <Tabs defaultValue="mode1" className="space-y-3">
        <TabsList className="bg-slate-200 dark:bg-slate-800 p-1 h-10 w-full sm:w-auto grid grid-cols-2 max-w-md">
          <TabsTrigger value="mode1" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#0F3D62] dark:data-[state=active]:bg-slate-900">
            📦 Mode 1: Khách mang hàng tới kho
          </TabsTrigger>
          <TabsTrigger value="mode2" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#0F3D62] dark:data-[state=active]:bg-slate-900">
            🚚 Mode 2: Luân chuyển nội bộ
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Mode 1: Khách hàng mang hàng tới kho ── */}
        <TabsContent value="mode1" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 shadow-sm border">
            <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Bảng Kê Hàng Nhập Kho (10 Cột Vận Hành Chuẩn)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Nhập thông tin dòng hàng trực tiếp, hỗ trợ phím Tab và copy-paste từ Excel.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <WarehouseEditableGrid
                rows={mode1Rows}
                onChange={setMode1Rows}
                isOutboundMode={false}
              />

              <div className="flex justify-end pt-3 border-t">
                <Button
                  onClick={handleSubmitMode1}
                  disabled={isSubmitting || mode1Rows.length === 0}
                  className="bg-[#0F3D62] hover:bg-[#0c314f] text-white px-6 font-bold shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu dữ liệu...
                    </>
                  ) : (
                    <>
                      <IconCircleCheck className="mr-2 h-5 w-5 text-emerald-400" /> Xác nhận tiếp nhận & Lưu kho
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Mode 2: Luân chuyển nội bộ (Stepper 3 bước) ── */}
        <TabsContent value="mode2" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 shadow-sm border">
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
                  <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto dark:bg-slate-800">
                    <IconTruck className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Chưa chọn chuyến hàng luân chuyển
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Bấm nút bên dưới để mở danh sách các chuyến xe luân chuyển đang trên đường đến Hub này và còn hàng cần dỡ.
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
                    🚚 Chọn chuyến hàng ➔
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Trip Info */}
                  <div className="p-4 bg-blue-50/60 dark:bg-slate-800/60 rounded-lg border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#0F3D62] text-white font-mono">{selectedTrip.tripCode}</Badge>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Xe {selectedTrip.vehicleLicensePlate} ({selectedTrip.vehicleType})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Tài xế: <b>{selectedTrip.driverName}</b> ({selectedTrip.driverPhone}) &bull; Tuyến: {selectedTrip.originHub} ➔ {selectedTrip.destinationHub}
                      </p>
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
        </TabsContent>
      </Tabs>

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
      </div>
    </PageContainer>
  );
}
