'use client';

import { useState, useEffect, useMemo } from 'react';
import { fleetApi, Vehicle, Driver } from '@/features/fleet/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  IconTruck,
  IconUserCheck,
  IconTools,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconMapPin,
} from '@tabler/icons-react';

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [deletingItem, setDeletingItem] = useState<{
    type: 'vehicle' | 'driver';
    id: number;
    name: string;
  } | null>(null);

  // Form states - Vehicle
  const [vLicensePlate, setVLicensePlate] = useState('');
  const [vModel, setVModel] = useState('');
  const [vType, setVType] = useState('CONTAINER_40FT');
  const [vMaxWeight, setVMaxWeight] = useState(25000);
  const [vMaxVolume, setVMaxVolume] = useState(65.5);
  const [vCurrentHub, setVCurrentHub] = useState('Andromeda Hub (Hà Nội)');
  const [vStatus, setVStatus] = useState<'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'>('AVAILABLE');

  // Form states - Driver
  const [dFullName, setDFullName] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dLicenseNumber, setDLicenseNumber] = useState('');
  const [dLicenseClass, setDLicenseClass] = useState('FC');
  const [dExperienceYears, setDExperienceYears] = useState(5);
  const [dStatus, setDStatus] = useState<'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY'>('AVAILABLE');

  const loadData = async () => {
    try {
      setLoading(true);
      const [vData, dData] = await Promise.all([
        fleetApi.getVehicles(),
        fleetApi.getDrivers(),
      ]);
      setVehicles(vData);
      setDrivers(dData);
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.model && v.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.currentHub && v.currentHub.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm) ||
        (d.licenseNumber && d.licenseNumber.includes(searchTerm));
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [drivers, searchTerm, statusFilter]);

  // Handle Vehicle submit
  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        licensePlate: vLicensePlate,
        model: vModel,
        type: vType,
        maxWeight: Number(vMaxWeight),
        maxVolume: Number(vMaxVolume),
        currentHub: vCurrentHub,
        status: vStatus,
      };

      if (editingVehicle) {
        await fleetApi.updateVehicle(editingVehicle.id, payload);
      } else {
        await fleetApi.createVehicle(payload);
      }
      setIsVehicleModalOpen(false);
      resetVehicleForm();
      await loadData();
    } catch (err) {
      console.error('Failed to save vehicle:', err);
    }
  };

  // Handle Driver submit
  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        fullName: dFullName,
        phone: dPhone,
        licenseNumber: dLicenseNumber,
        licenseClass: dLicenseClass,
        experienceYears: Number(dExperienceYears),
        status: dStatus,
      };

      if (editingDriver) {
        await fleetApi.updateDriver(editingDriver.id, payload);
      } else {
        await fleetApi.createDriver(payload);
      }
      setIsDriverModalOpen(false);
      resetDriverForm();
      await loadData();
    } catch (err) {
      console.error('Failed to save driver:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === 'vehicle') {
        await fleetApi.deleteVehicle(deletingItem.id);
      } else {
        await fleetApi.deleteDriver(deletingItem.id);
      }
      setDeletingItem(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const openAddVehicleModal = () => {
    setEditingVehicle(null);
    resetVehicleForm();
    setIsVehicleModalOpen(true);
  };

  const openEditVehicleModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setVLicensePlate(v.licensePlate);
    setVModel(v.model || '');
    setVType(v.type);
    setVMaxWeight(v.maxWeight);
    setVMaxVolume(v.maxVolume);
    setVCurrentHub(v.currentHub || '');
    setVStatus(v.status);
    setIsVehicleModalOpen(true);
  };

  const openAddDriverModal = () => {
    setEditingDriver(null);
    resetDriverForm();
    setIsDriverModalOpen(true);
  };

  const openEditDriverModal = (d: Driver) => {
    setEditingDriver(d);
    setDFullName(d.fullName);
    setDPhone(d.phone);
    setDLicenseNumber(d.licenseNumber || '');
    setDLicenseClass(d.licenseClass);
    setDExperienceYears(d.experienceYears);
    setDStatus(d.status);
    setIsDriverModalOpen(true);
  };

  const resetVehicleForm = () => {
    setVLicensePlate('');
    setVModel('');
    setVType('CONTAINER_40FT');
    setVMaxWeight(25000);
    setVMaxVolume(65.5);
    setVCurrentHub('Andromeda Hub (Hà Nội)');
    setVStatus('AVAILABLE');
  };

  const resetDriverForm = () => {
    setDFullName('');
    setDPhone('');
    setDLicenseNumber('');
    setDLicenseClass('FC');
    setDExperienceYears(5);
    setDStatus('AVAILABLE');
  };

  const getVehicleStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 cursor-pointer">Sẵn Sàng</Badge>;
      case 'IN_USE':
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20 cursor-pointer">Đang Chạy Chuyến</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20 cursor-pointer">Bảo Trì</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDriverStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 cursor-pointer">Sẵn Sàng</Badge>;
      case 'ON_TRIP':
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20 cursor-pointer">Đang Đi Chuyến</Badge>;
      case 'OFF_DUTY':
        return <Badge className="bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 border-gray-500/20 cursor-pointer">Nghỉ Phép</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <IconTruck className="h-7 w-7 text-primary" />
            Quản Lý Đội Xe & Tài Xế
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi danh sách phương tiện, sức chứa tải trọng, bằng lái & tình trạng tài xế Spider Express
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            id="btn-add-vehicle"
            onClick={openAddVehicleModal}
            className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-150"
          >
            <IconPlus className="mr-2 h-4 w-4" />
            Thêm Xe Mới
          </Button>
          <Button
            id="btn-add-driver"
            onClick={openAddDriverModal}
            variant="outline"
            className="cursor-pointer border-primary/30 hover:bg-accent text-foreground shadow-sm transition-all duration-150"
          >
            <IconUserCheck className="mr-2 h-4 w-4 text-primary" />
            Thêm Tài Xế Mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-xs border-border/60 hover:border-primary/40 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Số Xe</CardTitle>
            <IconTruck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Phương tiện vận chuyển</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60 hover:border-blue-500/40 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Xe Đang Chạy Chuyến</CardTitle>
            <IconTruck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {vehicles.filter((v) => v.status === 'IN_USE').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Trên hành trình vận tải</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60 hover:border-emerald-500/40 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Số Tài Xế</CardTitle>
            <IconUserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{drivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Đã đăng ký bằng lái</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60 hover:border-amber-500/40 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Xe Bảo Trì</CardTitle>
            <IconTools className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {vehicles.filter((v) => v.status === 'MAINTENANCE').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Đang kiểm tra bảo dưỡng</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Workspace */}
      <Tabs
        defaultValue="vehicles"
        onValueChange={(val) => {
          setActiveTab(val as 'vehicles' | 'drivers');
          setStatusFilter('ALL');
        }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-2 rounded-xl border border-border/50">
          <TabsList className="bg-muted p-1">
            <TabsTrigger
              value="vehicles"
              id="tab-vehicles"
              className="cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <IconTruck className="h-4 w-4 mr-2" />
              Danh Sách Xe ({vehicles.length})
            </TabsTrigger>
            <TabsTrigger
              value="drivers"
              id="tab-drivers"
              className="cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-xs px-4"
            >
              <IconUserCheck className="h-4 w-4 mr-2" />
              Danh Sách Tài Xế ({drivers.length})
            </TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="fleet-search-input"
                type="search"
                placeholder={activeTab === 'vehicles' ? 'Tìm biển số, mẫu xe, hub...' : 'Tìm họ tên, SĐT, số GPLX...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background shadow-xs h-9 text-sm"
              />
            </div>

            <select
              id="fleet-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-sm bg-background border border-input rounded-md shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/50"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {activeTab === 'vehicles' ? (
                <>
                  <option value="AVAILABLE">Sẵn Sàng</option>
                  <option value="IN_USE">Đang Chạy Chuyến</option>
                  <option value="MAINTENANCE">Bảo Trì</option>
                </>
              ) : (
                <>
                  <option value="AVAILABLE">Sẵn Sàng</option>
                  <option value="ON_TRIP">Đang Đi Chuyến</option>
                  <option value="OFF_DUTY">Nghỉ Phép</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Vehicles Content */}
        <TabsContent value="vehicles" className="m-0 space-y-4">
          <Card className="border-border/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3">Biển Số Xe</th>
                    <th className="px-4 py-3">Mẫu Xe & Loại</th>
                    <th className="px-4 py-3">Tải Trọng Tối Đa (Kg)</th>
                    <th className="px-4 py-3">Thể Tích Tối Đa (m³)</th>
                    <th className="px-4 py-3">Kho / Hub Trực Thuộc</th>
                    <th className="px-4 py-3">Trạng Thái</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Đang tải dữ liệu đội xe...
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy xe nào khớp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr
                        key={v.id}
                        data-testid={`vehicle-row-${v.id}`}
                        className="hover:bg-muted/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20 font-mono text-xs">
                            {v.licensePlate}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{v.model || 'Chưa cập nhật'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{v.type}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {v.maxWeight.toLocaleString('vi-VN')} kg
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {v.maxVolume} m³
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <IconMapPin className="h-3.5 w-3.5 text-primary/70" />
                            {v.currentHub || 'Kho Trung Chuyển'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getVehicleStatusBadge(v.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Chỉnh sửa xe"
                              data-testid={`btn-edit-vehicle-${v.id}`}
                              onClick={() => openEditVehicleModal(v)}
                              className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <IconEdit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Xóa xe"
                              data-testid={`btn-delete-vehicle-${v.id}`}
                              onClick={() =>
                                setDeletingItem({
                                  type: 'vehicle',
                                  id: v.id,
                                  name: v.licensePlate,
                                })
                              }
                              className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Drivers Content */}
        <TabsContent value="drivers" className="m-0 space-y-4">
          <Card className="border-border/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-border/40">
                  <tr className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border/60">
                    <td className="px-4 py-3">Họ Và Tên</td>
                    <td className="px-4 py-3">Số Điện Thoại</td>
                    <td className="px-4 py-3">Số GPLX & Hạng</td>
                    <td className="px-4 py-3">Kinh Nghiệm</td>
                    <td className="px-4 py-3">Trạng Thái</td>
                    <td className="px-4 py-3 text-right">Thao Tác</td>
                  </tr>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Đang tải dữ liệu tài xế...
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy tài xế nào khớp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((d) => (
                      <tr
                        key={d.id}
                        data-testid={`driver-row-${d.id}`}
                        className="hover:bg-muted/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {d.fullName}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {d.phone}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">
                              {d.licenseNumber || 'N/A'}
                            </span>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                              Hạng {d.licenseClass}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          {d.experienceYears} Năm
                        </td>
                        <td className="px-4 py-3">
                          {getDriverStatusBadge(d.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Chỉnh sửa tài xế"
                              data-testid={`btn-edit-driver-${d.id}`}
                              onClick={() => openEditDriverModal(d)}
                              className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <IconEdit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Xóa tài xế"
                              data-testid={`btn-delete-driver-${d.id}`}
                              onClick={() =>
                                setDeletingItem({
                                  type: 'driver',
                                  id: d.id,
                                  name: d.fullName,
                                })
                              }
                              className="h-8 px-2 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Vehicle Modal */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="sm:max-w-[500px]" id="vehicle-form-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTruck className="h-5 w-5 text-primary" />
              {editingVehicle ? 'Chỉnh Sửa Thông Tin Xe' : 'Thêm Phương Tiện Mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleVehicleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-license-plate" className="text-xs font-semibold text-muted-foreground">Biển Số Xe *</label>
                <Input
                  id="input-license-plate"
                  required
                  placeholder="VD: 75H-051.21"
                  value={vLicensePlate}
                  onChange={(e) => setVLicensePlate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="input-vehicle-model" className="text-xs font-semibold text-muted-foreground">Mẫu Xe / Thương Hiệu</label>
                <Input
                  id="input-vehicle-model"
                  placeholder="VD: Volvo FH16"
                  value={vModel}
                  onChange={(e) => setVModel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="select-vehicle-type" className="text-xs font-semibold text-muted-foreground">Loại Xe *</label>
                <select
                  id="select-vehicle-type"
                  value={vType}
                  onChange={(e) => setVType(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer"
                >
                  <option value="CONTAINER_40FT">Container 40ft</option>
                  <option value="CONTAINER_20FT">Container 20ft</option>
                  <option value="TRUCK_8T">Xe Tải 8 Tấn</option>
                  <option value="TRUCK_5T">Xe Tải 5 Tấn</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="select-vehicle-status" className="text-xs font-semibold text-muted-foreground">Trạng Thái *</label>
                <select
                  id="select-vehicle-status"
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value as 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE')}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer"
                >
                  <option value="AVAILABLE">Sẵn Sàng</option>
                  <option value="IN_USE">Đang Chạy Chuyến</option>
                  <option value="MAINTENANCE">Bảo Trì</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-max-weight" className="text-xs font-semibold text-muted-foreground">Tải Trọng Max (Kg) *</label>
                <Input
                  id="input-max-weight"
                  type="number"
                  required
                  value={vMaxWeight}
                  onChange={(e) => setVMaxWeight(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="input-max-volume" className="text-xs font-semibold text-muted-foreground">Thể Tích Max (m³) *</label>
                <Input
                  id="input-max-volume"
                  type="number"
                  step="0.1"
                  required
                  value={vMaxVolume}
                  onChange={(e) => setVMaxVolume(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-current-hub" className="text-xs font-semibold text-muted-foreground">Kho / Hub Trực Thuộc</label>
              <Input
                id="input-current-hub"
                placeholder="VD: Andromeda Hub (Hà Nội)"
                value={vCurrentHub}
                onChange={(e) => setVCurrentHub(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVehicleModalOpen(false)}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button type="submit" id="btn-save-vehicle" className="cursor-pointer bg-primary text-primary-foreground">
                {editingVehicle ? 'Cập Nhật Xe' : 'Tạo Xe Mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Driver Modal */}
      <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
        <DialogContent className="sm:max-w-[500px]" id="driver-form-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserCheck className="h-5 w-5 text-primary" />
              {editingDriver ? 'Chỉnh Sửa Thông Tin Tài Xế' : 'Thêm Tài Xế Mới'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDriverSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-driver-name" className="text-xs font-semibold text-muted-foreground">Họ Và Tên *</label>
                <Input
                  id="input-driver-name"
                  required
                  placeholder="VD: Nguyễn Văn Tài"
                  value={dFullName}
                  onChange={(e) => setDFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="input-driver-phone" className="text-xs font-semibold text-muted-foreground">Số Điện Thoại *</label>
                <Input
                  id="input-driver-phone"
                  required
                  placeholder="VD: 0905123456"
                  value={dPhone}
                  onChange={(e) => setDPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-driver-license-no" className="text-xs font-semibold text-muted-foreground">Số GPLX</label>
                <Input
                  id="input-driver-license-no"
                  placeholder="VD: 790123456789"
                  value={dLicenseNumber}
                  onChange={(e) => setDLicenseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="select-driver-license-class" className="text-xs font-semibold text-muted-foreground">Hạng Bằng Lái *</label>
                <select
                  id="select-driver-license-class"
                  value={dLicenseClass}
                  onChange={(e) => setDLicenseClass(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer"
                >
                  <option value="FC">Hạng FC (Container)</option>
                  <option value="C">Hạng C (Xe Tải Nặng)</option>
                  <option value="E">Hạng E (Xe Khách/Container)</option>
                  <option value="D">Hạng D</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-driver-exp" className="text-xs font-semibold text-muted-foreground">Số Năm Kinh Nghiệm</label>
                <Input
                  id="input-driver-exp"
                  type="number"
                  value={dExperienceYears}
                  onChange={(e) => setDExperienceYears(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="select-driver-status" className="text-xs font-semibold text-muted-foreground">Trạng Thái *</label>
                <select
                  id="select-driver-status"
                  value={dStatus}
                  onChange={(e) => setDStatus(e.target.value as 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY')}
                  className="w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer"
                >
                  <option value="AVAILABLE">Sẵn Sàng</option>
                  <option value="ON_TRIP">Đang Đi Chuyến</option>
                  <option value="OFF_DUTY">Nghỉ Phép</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDriverModalOpen(false)}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button type="submit" id="btn-save-driver" className="cursor-pointer bg-primary text-primary-foreground">
                {editingDriver ? 'Cập Nhật Tài Xế' : 'Tạo Tài Xế Mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent id="delete-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Xác Nhận Xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn xóa {deletingItem?.type === 'vehicle' ? 'xe' : 'tài xế'}{' '}
            <strong className="text-foreground">{deletingItem?.name}</strong>? Thao tác này sẽ đánh dấu xóa trong hệ thống.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItem(null)} className="cursor-pointer">
              Hủy
            </Button>
            <Button
              id="btn-confirm-delete"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="cursor-pointer"
            >
              Xóa Ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
