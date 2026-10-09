'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconSearch,
  IconBuildingWarehouse,
  IconPrinter,
  IconLoader2,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronsRight,
  IconRefresh,
  IconTrash,
  IconEye,
  IconTruck
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import {
  PalletLabelA4Modal,
  PalletLabelData
} from '@/features/warehouse/components/pallet-label-a4-modal';
import {
  WarehouseWaybillDetailModal,
  WaybillDetailData
} from '@/features/warehouse/components/warehouse-waybill-detail-modal';
import { toast } from 'sonner';
import { showApiErrorToast } from '@/lib/api-error';
import PageContainer from '@/components/layout/page-container';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { TablePaginationBar } from '@/components/ui/table/table-pagination-bar';

export default function WarehouseOrdersPage() {
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    totalPages: number;
    allCount?: number;
    storedCount?: number;
    draftCount?: number;
    dispatchedCount?: number;
  }>({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [printData, setPrintData] = useState<PalletLabelData | null>(null);

  // Waybill Detail Modal State
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillDetailData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Delete draft handler
  const handleDeleteDraft = async (id: number, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng nháp "${code}" không?`)) return;
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/orders/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw { response: { data: err, status: res.status } };
      }
      toast.success(`Đã xóa đơn hàng nháp ${code} thành công`);
      fetchOrders();
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể xóa đơn hàng');
    }
  };

  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = tokenManager.getAccessToken();
    const query = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      // One row per order code; lines sharing a code are returned in `items`
      groupBy: 'orderCode',
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {})
    });

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        setData(resData?.data ?? []);
        setMeta({
          total: resData?.meta?.total ?? 0,
          totalPages: resData?.meta?.totalPages || 1,
          allCount: resData?.meta?.allCount,
          storedCount: resData?.meta?.storedCount,
          draftCount: resData?.meta?.draftCount,
          dispatchedCount: resData?.meta?.dispatchedCount
        });
      })
      .catch(() => {
        setData([]);
        toast.error('Không tải được danh sách đơn hàng kho. Vui lòng thử lại.');
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Order codes whose member lines are expanded
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const toggleExpanded = (code: string) =>
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const COLUMN_COUNT = 7;

  /** Date/time formatting helper */
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return '—';
    }
  };

  /** Outbound date render guard: strictly empty (—) if stored, draft, or has stock */
  const renderOutboundDate = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    const status = (resolveDisplayStatus(r) || '').toUpperCase();
    const storedStatuses = [
      'INBOUND',
      'STORED',
      'LUU_KHO',
      'IN_WAREHOUSE',
      'DRAFT',
      'PENDING',
      'PENDING_INBOUND',
      'WAITING'
    ];

    if (stock > 0 || storedStatuses.includes(status) || !r.outboundDate) {
      return <span className='text-slate-400 font-semibold text-[10px]'>—</span>;
    }

    return (
      <span className='font-mono text-slate-700 dark:text-slate-300 text-[10px]'>
        {formatDateTime(r.outboundDate)}
      </span>
    );
  };
  const currentHubName = user?.hub?.name;

  /** Stock held at the viewer's hub (ledger) — falls back to remainingQuantity without hub scope. */
  const renderStock = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    return (
      <>
        <span className='font-bold text-emerald-600 dark:text-emerald-400'>{stock}</span>
        <span className='text-slate-400'> / {total} kiện</span>
      </>
    );
  };

  /** Status display guard: Never display "LƯU KHO" when stock at this hub is 0. */
  const resolveDisplayStatus = (r: any) => {
    const rawStock = Number(r.hubStock ?? r.remainingQuantity ?? 0);
    const rawTotal = Number(r.totalQuantity ?? 0);
    const total = Math.max(rawTotal, rawStock, 0);
    const stock = Math.max(0, Math.min(rawStock, total));
    const rawStatus = (r.hubStatus ?? r.status ?? '').toUpperCase();
    if (
      stock === 0 &&
      (rawStatus === 'INBOUND' ||
        rawStatus === 'STORED' ||
        rawStatus === 'LUU_KHO' ||
        rawStatus === 'IN_WAREHOUSE')
    ) {
      return 'COMPLETED_INBOUND';
    }
    return r.hubStatus ?? r.status;
  };

  const renderTripCell = (r: any) => {
    const allTrips: any[] = Array.isArray(r.trips) && r.trips.length > 0 ? r.trips : [];
    const activeTrip = allTrips[0];
    const tripCode = activeTrip?.tripCode || (activeTrip?.id ? `TRIP-${activeTrip.id}` : null);
    const plate = activeTrip?.licensePlate || r.vehicleLicensePlate;
    const driver = activeTrip?.driverName || r.driverName;

    if (!tripCode && !plate && allTrips.length === 0) {
      return <span className='text-gray-400 italic text-[10px]'>—</span>;
    }

    const multiTruckCount = allTrips.length;
    const hasMultiTrucks = multiTruckCount > 1;
    const multiTruckTooltip = allTrips
      .map(
        (t: any, i: number) =>
          `Xe ${i + 1}: ${t.licensePlate || 'Chưa có BKS'} (${t.tripCode || 'Chưa có mã trip'})${
            t.driverName ? ` - ${t.driverName}` : ''
          }`
      )
      .join('\n');

    return (
      <div
        className='text-[10px] space-y-0.5'
        title={hasMultiTrucks ? multiTruckTooltip : undefined}
      >
        {tripCode && (
          <div className='font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center gap-1'>
            <span>{tripCode}</span>
            {hasMultiTrucks && (
              <Badge
                variant='outline'
                className='text-[9px] font-bold px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
                title={`Đơn hàng gồm ${multiTruckCount} chuyến xe tiếp nhận`}
              >
                +{multiTruckCount - 1} trip
              </Badge>
            )}
          </div>
        )}
        {plate && (
          <div className='font-mono font-semibold text-slate-800 dark:text-slate-200 text-[10px] flex items-center gap-1 flex-wrap'>
            <IconTruck className='h-3 w-3 text-slate-400 shrink-0' />
            <span>{plate}</span>
            {hasMultiTrucks && (
              <Badge
                className='text-[9px] font-bold px-1 py-0 h-3.5 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-0'
                title={`Vận chuyển bởi ${multiTruckCount} phương tiện:\n${multiTruckTooltip}`}
              >
                +{multiTruckCount - 1} xe
              </Badge>
            )}
          </div>
        )}
        {driver && (
          <div className='text-[9px] text-gray-400 truncate max-w-[120px]' title={driver}>
            {driver}
          </div>
        )}
      </div>
    );
  };

  /** Actions for one physical cargo line (detail, label, delete draft). */
  const renderActions = (m: any, openDetail: (target: any) => void) => (
    <div className='flex items-center justify-center gap-1'>
      <Button
        size='sm'
        variant='ghost'
        onClick={() => openDetail(m)}
        className='h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50'
        title='Xem chi tiết vận đơn'
      >
        <IconEye className='h-4 w-4' />
      </Button>
      <Button
        size='sm'
        variant='ghost'
        onClick={() =>
          setPrintData({
            orderCode: m.orderCode,
            goodsDescription: m.goodsDescription || '',
            totalQuantity: m.totalQuantity ?? 0,
            packagesOnPallet: m.totalQuantity ?? 0,
            palletIndex: 1,
            totalPallets: 1,
            destinationHub: m.destinationHub || m.route,
            warehouseName: m.currentHubEntity?.name,
            createdAt: m.createdAt
          })
        }
        className='h-7 w-7 p-0 text-blue-600 hover:bg-blue-50'
        title='In tem nhận diện A4'
      >
        <IconPrinter className='h-4 w-4' />
      </Button>
      {m.status === 'DRAFT' && (
        <Button
          size='sm'
          variant='ghost'
          onClick={() => handleDeleteDraft(m.id, m.orderCode)}
          className='h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          title='Xóa đơn nháp'
        >
          <IconTrash className='h-4 w-4' />
        </Button>
      )}
    </div>
  );

  return (
    <PageContainer>
      <div className='space-y-2 flex-1 w-full min-w-0'>
        {/* Page Header */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
          <div>
            <h1 className='text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400'>
              <IconBuildingWarehouse className='h-6 w-6' />
              <span>Tổng Hợp Đơn Hàng Tại Kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
            </h1>
            <p className='text-xs text-slate-500 mt-0.5'>
              Theo dõi, tra cứu và in lại tem nhãn nhận diện A4 cho các lô hàng lưu kho và xuất kho.
            </p>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={fetchOrders}
            disabled={isLoading}
            className='h-8 text-xs font-bold border-slate-300'
          >
            <IconRefresh className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Main Filter & Data Table Card */}
        <Card className='bg-white dark:bg-slate-900 shadow-sm border py-0'>
          <CardContent className='p-1 space-y-1.5'>
            {/* Toolbar */}
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='relative flex-1 min-w-[260px]'>
                <IconSearch className='absolute left-3 top-2.5 h-4 w-4 text-gray-400' />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder='Tìm kiếm theo mã đơn hoặc tên hàng...'
                  className='pl-9 h-9 text-xs'
                />
              </div>

              <div className='flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold'>
                {['ALL', 'INBOUND', 'DRAFT', 'COMPLETED_INBOUND'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setStatusFilter(tab);
                      setPage(1);
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                        : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
                    }`}
                  >
                    {tab === 'ALL'
                      ? `Tất cả${meta.allCount != null ? ` (${meta.allCount})` : ''}`
                      : tab === 'INBOUND'
                        ? `LƯU KHO${meta.storedCount != null ? ` (${meta.storedCount})` : ''}`
                        : tab === 'DRAFT'
                          ? `ĐƠN NHÁP${meta.draftCount != null ? ` (${meta.draftCount})` : ''}`
                          : `ĐÃ XUẤT KHO${meta.dispatchedCount != null ? ` (${meta.dispatchedCount})` : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className='border rounded-lg overflow-x-auto'>
              <table className='w-full text-[11px] text-left min-w-[900px]'>
                <thead className='bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[10px] sticky top-0 z-10'>
                  <tr>
                    <th className='py-1 px-1.5 w-[40px] text-center'>STT</th>
                    <th className='py-1 px-1.5 w-[120px]'>NGÀY NHẬP</th>
                    <th className='py-1 px-1.5 min-w-[200px]'>MÃ VẬN ĐƠN</th>
                    <th
                      className='py-1 px-1.5 w-[110px] text-right'
                      title='Số kiện đang nằm tại kho / tổng số kiện của đơn'
                    >
                      SỐ LƯỢNG TỒN KHO
                    </th>
                    <th className='py-1 px-1.5 w-[100px] text-center'>TRẠNG THÁI</th>
                    <th className='py-1 px-1.5 w-[120px] text-center'>NGÀY XUẤT</th>
                    <th className='py-1 px-1.5 w-[90px] text-center'>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className='p-2 text-center text-gray-500'>
                        <IconLoader2 className='h-6 w-6 animate-spin mx-auto mb-2 text-blue-600' />
                        Đang tải dữ liệu đơn hàng...
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_COUNT} className='p-2 text-center text-gray-400'>
                        Không tìm thấy đơn hàng nào
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => {
                      const members: any[] =
                        Array.isArray(row.items) && row.items.length > 0 ? row.items : [row];
                      const isMulti = members.length > 1;
                      const isExpanded = isMulti && expandedCodes.has(row.orderCode);
                      const openDetail = (target: any) => {
                        setSelectedWaybill(target);
                        setIsDetailModalOpen(true);
                      };

                      return (
                        <React.Fragment key={`${row.orderCode}-${row.id}`}>
                          <tr
                            onClick={() =>
                              isMulti ? toggleExpanded(row.orderCode) : openDetail(members[0])
                            }
                            className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-blue-50/30 dark:bg-slate-800/30' : ''
                            }`}
                          >
                            <td className='py-1 px-1.5 text-center font-mono text-gray-400 text-[10px]'>
                              {((page - 1) * pageSize + idx + 1).toString().padStart(2, '0')}
                            </td>
                            <td className='py-1 px-1.5 font-mono text-slate-600 dark:text-slate-400 text-[10px]'>
                              {formatDateTime(row.inboundDate || row.createdAt)}
                            </td>
                            <td className='py-1 px-1.5'>
                              <div className='flex items-center gap-1'>
                                {isMulti &&
                                  (isExpanded ? (
                                    <IconChevronDown className='h-3 w-3 text-slate-500 shrink-0' />
                                  ) : (
                                    <IconChevronRight className='h-3 w-3 text-slate-500 shrink-0' />
                                  ))}
                                <span className='font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]'>
                                  {row.orderCode}
                                </span>
                                {isMulti && (
                                  <Badge
                                    variant='outline'
                                    className='text-[9px] px-1 py-0 h-3.5 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  >
                                    {members.length} dòng hàng
                                  </Badge>
                                )}
                              </div>
                              <div
                                className='text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 space-x-1 truncate max-w-[340px]'
                                title={`${row.goodsDescription || 'Hàng tổng hợp'} | ${(Number(row.totalWeight) || 0).toLocaleString('vi-VN')} kg | ${(Number(row.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³ | ${row.destinationHub || row.route || 'Giao khách lẻ'}`}
                              >
                                <span className='font-medium text-slate-700 dark:text-slate-200'>{row.goodsDescription || 'Hàng tổng hợp'}</span>
                                <span>•</span>
                                <span>{(Number(row.totalWeight) || 0).toLocaleString('vi-VN')} kg</span>
                                <span>•</span>
                                <span>{(Number(row.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³</span>
                                <span>•</span>
                                <span className='text-indigo-600 dark:text-indigo-400 font-medium'>{row.destinationHub || row.route || 'Giao khách lẻ'}</span>
                              </div>
                            </td>
                            <td className='py-1 px-1.5 text-right text-[10px] whitespace-nowrap'>
                              {renderStock(row)}
                            </td>
                            <td className='py-1 px-1.5 text-center'>
                              {renderWarehouseOrderStatusBadge(resolveDisplayStatus(row))}
                            </td>
                            <td className='py-1 px-1.5 text-center'>
                              {renderOutboundDate(row)}
                            </td>
                            <td
                              className='py-1 px-1.5 text-center'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isMulti ? (
                                <div className='flex items-center justify-center gap-1'>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() => toggleExpanded(row.orderCode)}
                                    className='h-7 px-1.5 text-[10px] text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                    title='Xem từng dòng hàng của đơn'
                                  >
                                    {isExpanded ? 'Thu gọn' : 'Xem dòng'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={() => openDetail(row)}
                                    className='h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                    title='Xem chi tiết tổng hợp'
                                  >
                                    <IconEye className='h-4 w-4' />
                                  </Button>
                                </div>
                              ) : (
                                renderActions(members[0], openDetail)
                              )}
                            </td>
                          </tr>

                          {isExpanded &&
                            members.map((m, mIdx) => (
                              <tr
                                key={`member-${m.id}`}
                                onClick={() => openDetail(m)}
                                className='bg-slate-50/60 dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors'
                              >
                                <td className='py-1 px-1.5 text-center font-mono text-gray-300 text-[10px]'>
                                  {mIdx + 1}
                                </td>
                                <td className='py-1 px-1.5 font-mono text-slate-500 text-[10px]'>
                                  {formatDateTime(m.inboundDate || m.createdAt || row.inboundDate || row.createdAt)}
                                </td>
                                <td className='py-1 px-1.5 pl-4'>
                                  <div className='font-mono text-slate-700 dark:text-slate-300 text-[10px] font-semibold'>
                                    Dòng {mIdx + 1}
                                  </div>
                                  <div
                                    className='text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 space-x-1 truncate max-w-[320px]'
                                    title={`${m.goodsDescription || '—'} | ${(Number(m.totalWeight) || 0).toLocaleString('vi-VN')} kg | ${(Number(m.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³ | ${m.destinationHub || m.destinationHubEntity?.name || m.route || 'Giao khách lẻ'}`}
                                  >
                                    <span className='font-medium text-slate-700 dark:text-slate-200'>{m.goodsDescription || '—'}</span>
                                    <span>•</span>
                                    <span>{(Number(m.totalWeight) || 0).toLocaleString('vi-VN')} kg</span>
                                    <span>•</span>
                                    <span>{(Number(m.totalVolume) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} m³</span>
                                    <span>•</span>
                                    <span className='text-indigo-600 dark:text-indigo-400 font-medium'>{m.destinationHub || m.destinationHubEntity?.name || m.route || 'Giao khách lẻ'}</span>
                                  </div>
                                </td>
                                <td className='py-1 px-1.5 text-right text-[10px] whitespace-nowrap'>
                                  {renderStock(m)}
                                </td>
                                <td className='py-1 px-1.5 text-center'>
                                  {renderWarehouseOrderStatusBadge(resolveDisplayStatus(m))}
                                </td>
                                <td className='py-1 px-1.5 text-center'>
                                  {renderOutboundDate(m)}
                                </td>
                                <td
                                  className='py-1 px-1.5 text-center'
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {renderActions(m, openDetail)}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar with Page Size Selector */}
            <div className='pt-2 border-t border-slate-100 dark:border-slate-800'>
              <TablePaginationBar
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20, 50, 100]}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Modal In Tem A4 */}
        <PalletLabelA4Modal
          isOpen={!!printData}
          onClose={() => setPrintData(null)}
          data={printData}
        />

        {/* Modal Chi Tiết Vận Đơn & Timeline 3 Chặng Xe */}
        <WarehouseWaybillDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          waybill={selectedWaybill}
          onPrintLabel={(w) => {
            setIsDetailModalOpen(false);
            setPrintData({
              orderCode: w.orderCode,
              goodsDescription: w.goodsDescription || '',
              totalQuantity: w.totalQuantity ?? 0,
              packagesOnPallet: w.totalQuantity ?? 0,
              palletIndex: 1,
              totalPallets: 1,
              destinationHub: w.destinationHub || w.route,
              warehouseName: w.currentHubEntity?.name,
              createdAt: w.createdAt
            });
          }}
        />
      </div>
    </PageContainer>
  );
}
