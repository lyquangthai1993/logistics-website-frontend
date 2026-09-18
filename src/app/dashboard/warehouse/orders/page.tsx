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
  IconChevronsRight,
  IconRefresh,
  IconTrash,
  IconEye,
  IconTruck,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { PalletLabelA4Modal, PalletLabelData } from '@/features/warehouse/components/pallet-label-a4-modal';
import { WarehouseWaybillDetailModal, WaybillDetailData } from '@/features/warehouse/components/warehouse-waybill-detail-modal';
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
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
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
        headers: (token ? { Authorization: `Bearer ${token}` } : {}),
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
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    });

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        setData(resData?.data || []);
        setMeta({
          total: resData?.meta?.total || 0,
          totalPages: resData?.meta?.totalPages || 1,
        });
      })
      .catch(() => {
        setData([]);
      })
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const currentHubName = user?.hub?.name;

  return (
    <PageContainer>
      <div className="space-y-4 flex-1 w-full min-w-0">
        {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-[#0F3D62] dark:text-blue-400">
            <IconBuildingWarehouse className="h-6 w-6" />
            <span>Tổng Hợp Đơn Hàng Tại Kho{currentHubName ? ` · ${currentHubName}` : ''}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi, tra cứu và in lại tem nhãn nhận diện A4 cho các lô hàng lưu kho và xuất kho.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={isLoading}
          className="h-8 text-xs font-bold border-slate-300"
        >
          <IconRefresh className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Main Filter & Data Table Card */}
      <Card className="bg-white dark:bg-slate-900 shadow-sm border">
        <CardContent className="p-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm theo mã đơn hoặc tên hàng..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              {['ALL', 'INBOUND', 'DRAFT', 'COMPLETED_INBOUND'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setStatusFilter(tab);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === tab
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
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[950px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[11px]">
                <tr>
                  <th className="py-1.5 px-2 w-[45px] text-center">STT</th>
                  <th className="py-1.5 px-2 w-[160px]">MÃ ĐƠN HÀNG</th>
                  <th className="py-1.5 px-2 min-w-[150px]">TÊN HÀNG HÓA</th>
                  <th className="py-1.5 px-2 w-[140px]">CHUYẾN XE / TRIP</th>
                  <th className="py-1.5 px-2 w-[85px] text-right">TỒN KHO</th>
                  <th className="py-1.5 px-2 w-[75px] text-right">SỐ KIỆN</th>
                  <th className="py-1.5 px-2 w-[85px] text-right">SỐ KG</th>
                  <th className="py-1.5 px-2 w-[75px] text-right">SỐ M³</th>
                  <th className="py-1.5 px-2 min-w-[160px]">ĐÍCH ĐẾN</th>
                  <th className="py-1.5 px-2 w-[110px] text-center">TRẠNG THÁI</th>
                  <th className="py-1.5 px-2 w-[100px] text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-500">
                      <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải dữ liệu đơn hàng...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400">
                      Không tìm thấy đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        setSelectedWaybill(row);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-1.5 px-2 text-center font-mono text-gray-400 text-[11px]">
                        {((page - 1) * 15 + idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.orderCode}
                      </td>
                      <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200">
                        {row.goodsDescription || 'Hàng hóa tổng quan'}
                      </td>
                      <td className="py-1.5 px-2">
                        {(() => {
                          const activeTrip = row.trips?.[0];
                          const tripCode =
                            activeTrip?.tripCode ||
                            (activeTrip?.id ? `TRIP-${activeTrip.id}` : null);
                          const plate = activeTrip?.licensePlate || row.vehicleLicensePlate;
                          const driver = activeTrip?.driverName || row.driverName;

                          if (!tripCode && !plate) {
                            return <span className="text-gray-400 italic text-[11px]">—</span>;
                          }

                          return (
                            <div className="text-xs space-y-0.5">
                              {tripCode && (
                                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center gap-1">
                                  <span>{tripCode}</span>
                                  {row.trips && row.trips.length > 1 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 h-3.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50"
                                    >
                                      +{row.trips.length - 1}
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
                        {row.remainingQuantity ?? row.totalQuantity ?? 0} kiện
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                        {row.totalQuantity ?? 1}
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {row.totalWeight?.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {row.totalVolume?.toLocaleString('vi-VN')} m³
                      </td>
                      <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300">
                        {row.destinationHub || row.route || 'Giao khách lẻ'}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {renderWarehouseOrderStatusBadge(row.status)}
                      </td>
                      <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedWaybill(row);
                              setIsDetailModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Xem chi tiết vận đơn & Timeline 3 chặng xe"
                          >
                            <IconEye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPrintData({
                                orderCode: row.orderCode,
                                goodsDescription: row.goodsDescription || 'Hàng hóa tổng quan',
                                totalQuantity: row.totalQuantity || 10,
                                packagesOnPallet: row.totalQuantity || 10,
                                palletIndex: 1,
                                totalPallets: 1,
                                destinationHub: row.destinationHub || row.route,
                                createdAt: row.createdAt,
                              })
                            }
                            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                            title="In tem nhận diện A4"
                          >
                            <IconPrinter className="h-4 w-4" />
                          </Button>
                          {row.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDraft(row.id, row.orderCode)}
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Xóa đơn nháp"
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
            goodsDescription: w.goodsDescription || 'Hàng hóa tổng quan',
            totalQuantity: w.totalQuantity || 10,
            packagesOnPallet: w.totalQuantity || 10,
            palletIndex: 1,
            totalPallets: 1,
            destinationHub: w.destinationHub || w.route,
            createdAt: w.createdAt,
          });
        }}
      />
      </div>
    </PageContainer>
  );
}
