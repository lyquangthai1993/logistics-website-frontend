'use client';

import { useState, useEffect, useMemo } from 'react';
import { tripsApi, Trip } from '@/features/trips/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IconBox,
  IconTruck,
  IconCalendar,
  IconMapPin,
  IconSearch,
  IconCircleCheck,
  IconClock,
  IconAlertCircle,
  IconBuildingWarehouse
} from '@tabler/icons-react';
import { toast } from 'sonner';

const HUBS = [
  'Andromeda Hub (Hà Nội)',
  'Magellan Hub (Đà Nẵng)',
  'Centaurus Hub (TP.HCM)',
  'Pegasus Hub (Cần Thơ)',
  'Vela Hub (Hải Phòng)'
];

export default function WarehouseInboundPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadInboundTrips = async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getTrips();
      // Only show confirmed or in transit trips
      setTrips(data.filter((t) => t.status === 'CONFIRMED' || t.status === 'IN_TRANSIT'));
    } catch (err: any) {
      toast.error('Không thể tải danh sách chuyến xe Inbound', {
        description: err.response?.data?.message || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInboundTrips();
  }, []);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchHub =
        selectedHub === 'ALL' ||
        t.order?.destinationHub === selectedHub ||
        t.order?.originHub === selectedHub;
      const matchSearch =
        (t.order?.orderCode &&
          t.order.orderCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.vehicle?.licensePlate &&
          t.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.driver?.fullName &&
          t.driver.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.vehicle?.externalProvider &&
          t.vehicle.externalProvider.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchHub && matchSearch;
    });
  }, [trips, selectedHub, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const externalTrips = filteredTrips.filter((t) => t.vehicle?.isExternal).length;
    const totalWeight = filteredTrips.reduce((acc, t) => acc + (t.weightAllocated || 0), 0);
    const totalVolume = Number(
      filteredTrips.reduce((acc, t) => acc + (t.volumeAllocated || 0), 0).toFixed(1)
    );
    return { totalTrips, externalTrips, totalWeight, totalVolume };
  }, [filteredTrips]);

  return (
    <div className='flex-1 space-y-6 p-4 md:p-8 pt-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h2 className='text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2'>
            <IconBuildingWarehouse className='h-7 w-7 text-blue-600' />
            Inbound Hub & Kho Tiếp Nhận
          </h2>
          <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
            Bảng theo dõi các chuyến xe vận chuyển hàng hóa sắp cập bến Hub và kho lưu trữ (Inbound
            Board).
          </p>
        </div>

        <Button
          onClick={loadInboundTrips}
          variant='outline'
          size='sm'
          className='self-start md:self-auto'
        >
          <IconClock className='mr-2 h-4 w-4' /> Làm mới dữ liệu
        </Button>
      </div>

      {/* Metric Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-slate-600 dark:text-slate-400'>
              Tổng chuyến sắp đến
            </CardTitle>
            <IconTruck className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-slate-900 dark:text-slate-100'>
              {metrics.totalTrips}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Chuyến xe đã xác nhận / đang chạy</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-amber-600 dark:text-amber-400'>
              Xe thuê ngoài (Đối tác)
            </CardTitle>
            <IconAlertCircle className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {metrics.externalTrips}
            </div>
            <p className='text-xs text-slate-500 mt-1'>Cần kiểm tra giấy tờ đối tác</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
              Tổng tải trọng dự kiến
            </CardTitle>
            <IconBox className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
              {metrics.totalWeight.toLocaleString()} kg
            </div>
            <p className='text-xs text-slate-500 mt-1'>Khối lượng hàng tiếp nhận</p>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-purple-600 dark:text-purple-400'>
              Tổng thể tích hàng
            </CardTitle>
            <IconBox className='h-4 w-4 text-purple-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono'>
              {metrics.totalVolume} m³
            </div>
            <p className='text-xs text-slate-500 mt-1'>Thể tích kho cần chuẩn bị</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className='shadow-sm border-slate-200/80 dark:border-slate-800'>
        <CardContent className='p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4'>
          <div className='relative flex-1 max-w-md'>
            <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Tìm theo mã đơn, biển số, tài xế, nhà xe...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-9 bg-slate-50/50 dark:bg-slate-900'
            />
          </div>

          <div className='flex items-center gap-3'>
            <label
              htmlFor='warehouse-hub-filter'
              className='text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap'
            >
              Lọc theo Hub đích:
            </label>
            <select
              id='warehouse-hub-filter'
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className='px-3 py-2 text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none'
            >
              <option value='ALL'>Tất cả các Hub tiếp nhận</option>
              {HUBS.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inbound Cards Grid */}
      {loading ? (
        <div className='p-12 text-center text-slate-400'>Đang tải lịch trình tiếp nhận hàng...</div>
      ) : filteredTrips.length === 0 ? (
        <Card className='p-12 text-center border-dashed'>
          <IconCircleCheck className='h-10 w-10 text-emerald-500 mx-auto mb-2' />
          <p className='font-semibold text-slate-700 dark:text-slate-300'>
            Không có chuyến xe nào đang đến Hub đã chọn.
          </p>
          <p className='text-xs text-slate-500 mt-1'>
            Các chuyến xe được Fleet Manager xác nhận sẽ xuất hiện tại đây.
          </p>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filteredTrips.map((trip) => {
            const isExternal = trip.vehicle?.isExternal;
            return (
              <Card
                key={trip.id}
                className={`shadow-sm transition-all hover:shadow-md border ${
                  isExternal
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <CardHeader className='pb-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between'>
                  <div>
                    <span className='font-mono text-xs font-bold text-blue-600 dark:text-blue-400 block'>
                      {trip.order?.orderCode || `Đơn #${trip.orderId}`}
                    </span>
                    <CardTitle className='text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5'>
                      <span>Chuyến #{trip.sequenceNumber || trip.id}</span>
                      {isExternal && (
                        <Badge className='bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 font-bold text-[10px]'>
                          🚛 Xe ngoài
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <Badge variant='secondary' className='bg-emerald-100 text-emerald-800 text-xs'>
                    {trip.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đang chạy'}
                  </Badge>
                </CardHeader>

                <CardContent className='p-4 space-y-3'>
                  {/* Route & Hub */}
                  <div className='space-y-1 text-xs'>
                    <div className='flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium'>
                      <IconMapPin className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                      <span>{trip.order?.originHub?.split(' ')[0]}</span>
                      <span>&rarr;</span>
                      <strong className='text-slate-900 dark:text-slate-100'>
                        {trip.order?.destinationHub}
                      </strong>
                    </div>
                  </div>

                  {/* Vehicle & Driver Details */}
                  <div className='p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-800'>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-500'>Phương tiện:</span>
                      <span className='font-mono font-bold text-slate-900 dark:text-slate-100'>
                        {trip.vehicle?.licensePlate || '—'}
                      </span>
                    </div>

                    {isExternal && (
                      <div className='flex items-center justify-between text-amber-700 dark:text-amber-300 font-medium'>
                        <span>Nhà xe đối tác:</span>
                        <span className='font-bold'>
                          {trip.vehicle?.externalProvider || 'Thuê ngoài'}
                        </span>
                      </div>
                    )}

                    <div className='flex items-center justify-between'>
                      <span className='text-slate-500'>Tài xế & SĐT:</span>
                      <span className='font-medium text-slate-800 dark:text-slate-200'>
                        {trip.driver?.fullName || 'Chưa gán'} ({trip.driver?.phone || 'N/A'})
                      </span>
                    </div>
                  </div>

                  {/* Cargo Payload */}
                  <div className='grid grid-cols-2 gap-2 text-xs pt-1'>
                    <div>
                      <span className='text-slate-400 block'>Khối lượng nhận</span>
                      <span className='font-mono font-bold text-slate-900 dark:text-slate-100'>
                        {trip.weightAllocated.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className='text-slate-400 block'>Thể tích</span>
                      <span className='font-mono font-bold text-slate-900 dark:text-slate-100'>
                        {trip.volumeAllocated} m³
                      </span>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className='pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 flex items-center justify-between'>
                    <div className='flex items-center gap-1'>
                      <IconCalendar className='h-3.5 w-3.5 text-slate-400' />
                      <span>
                        Dự kiến đến:{' '}
                        <strong className='text-slate-800 dark:text-slate-200'>
                          {trip.estimatedDeliveryDate || 'Hôm nay'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
