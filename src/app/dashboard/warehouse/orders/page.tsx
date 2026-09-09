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
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';
import { PalletLabelA4Modal, PalletLabelData } from '@/features/warehouse/components/pallet-label-a4-modal';
import PageContainer from '@/components/layout/page-container';

export default function WarehouseOrdersPage() {
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [printData, setPrintData] = useState<PalletLabelData | null>(null);

  const fetchOrders = useCallback(() => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '15',
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
  }, [page, search, statusFilter]);

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
            <table className="w-full text-xs text-left min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                <tr>
                  <th className="p-2.5 w-[50px] text-center">STT</th>
                  <th className="p-2.5 w-[160px]">MÃ ĐƠN HÀNG</th>
                  <th className="p-2.5 min-w-[160px]">TÊN HÀNG HÓA</th>
                  <th className="p-2.5 w-[90px] text-right">SỐ KIỆN</th>
                  <th className="p-2.5 w-[100px] text-right">SỐ KG</th>
                  <th className="p-2.5 w-[90px] text-right">SỐ M³</th>
                  <th className="p-2.5 min-w-[180px]">ĐÍCH ĐẾN</th>
                  <th className="p-2.5 w-[120px] text-center">TRẠNG THÁI</th>
                  <th className="p-2.5 w-[90px] text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải dữ liệu đơn hàng...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      Không tìm thấy đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-center font-mono text-gray-400">
                        {((page - 1) * 15 + idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.orderCode}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {row.goodsDescription || 'Hàng hóa tổng quan'}
                      </td>
                      <td className="p-2.5 text-right font-bold">{row.totalQuantity ?? 1}</td>
                      <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.totalWeight?.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.totalVolume?.toLocaleString('vi-VN')} m³
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">
                        {row.destinationHub || row.route || 'Giao khách lẻ'}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={
                            row.status === 'INBOUND'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                              : row.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                                : 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                          }
                        >
                          {row.status === 'INBOUND'
                            ? 'LƯU KHO'
                            : row.status === 'COMPLETED_INBOUND'
                              ? 'ĐÃ XUẤT KHO'
                              : row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>
              Hiển thị {data.length} / {meta.total} đơn hàng
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="h-7 w-7 p-0"
              >
                <IconChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <IconChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 font-semibold">
                Trang {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
              >
                <IconChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(meta.totalPages)}
                className="h-7 w-7 p-0"
              >
                <IconChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal In Tem A4 */}
      <PalletLabelA4Modal
        isOpen={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />
      </div>
    </PageContainer>
  );
}
