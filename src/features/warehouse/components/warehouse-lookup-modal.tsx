'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconSearch,
  IconCheck,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconX,
  IconLoader2,
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/use-auth-store';

export interface WarehouseLookupItem {
  id: number;
  orderCode: string;
  goodsDescription?: string | null;
  totalQuantity?: number | null;
  totalWeight: number;
  totalVolume: number;
  status: string;
  route?: string | null;
  originHub?: string | null;
  destinationHub?: string | null;
}

interface WarehouseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: WarehouseLookupItem) => void;
  selectedOrderCodes?: string[];
  targetRowIndex?: number | null;
}

export function WarehouseLookupModal({
  isOpen,
  onClose,
  onSelectOrder,
  selectedOrderCodes = [],
  targetRowIndex,
}: WarehouseLookupModalProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INBOUND' | 'DRAFT'>('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<WarehouseLookupItem[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 1,
    storedCount: 0,
    draftCount: 0,
  });

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '8',
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    });

    fetch(`/api/v1/warehouse/orders?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((resData) => {
        if (!isMounted) return;
        const items = resData?.data || [];
        const total = resData?.meta?.total || items.length;
        const totalPages = resData?.meta?.totalPages || Math.ceil(total / 8) || 1;
        setData(items);
        setMeta((prev) => ({
          ...prev,
          total,
          totalPages,
        }));
      })
      .catch((err) => {
        console.error('Failed to fetch warehouse lookup orders:', err);
        // Fallback demo data if API not yet populated
        if (!isMounted) return;
        setData([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, search, statusFilter, page]);

  const handleRowSelect = (order: WarehouseLookupItem) => {
    onSelectOrder(order);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 bg-white dark:bg-slate-900">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <IconSearch className="h-5 w-5 text-blue-600" />
              <span>Tra Cứu Hàng Trong Kho · Andromeda Hub - HCM</span>
              {targetRowIndex !== null && targetRowIndex !== undefined && (
                <Badge variant="outline" className="ml-2 font-mono text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Dòng #{targetRowIndex + 1}
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* ── Search Bar & Status Filters ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 my-2">
          {/* Freetext Search: orderCode OR cargoDescription */}
          <div className="relative flex-1 min-w-[280px]">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Gõ mã đơn (VD: HCM-LTV...) hoặc tên hàng hóa để tra cứu..."
              className="pl-9 h-9 text-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-bold dark:bg-slate-700 dark:text-white'
                  : 'text-gray-600 hover:text-slate-900 dark:text-gray-400'
              }`}
            >
              Tất cả ({meta.total})
            </button>
            <button
              onClick={() => {
                setStatusFilter('INBOUND');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'INBOUND'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-emerald-700 dark:text-gray-400'
              }`}
            >
              LƯU KHO
            </button>
            <button
              onClick={() => {
                setStatusFilter('DRAFT');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'DRAFT'
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-amber-700 dark:text-gray-400'
              }`}
            >
              DRAFT
            </button>
          </div>
        </div>

        {/* ── 7-Column Canonical Table (No Location, No Office Columns) ── */}
        <div className="border rounded-lg overflow-hidden my-2">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-2.5 w-[140px]">MÃ ĐƠN HÀNG</th>
                <th className="p-2.5 min-w-[160px]">TÊN HÀNG HÓA</th>
                <th className="p-2.5 w-[80px] text-right">SỐ KIỆN</th>
                <th className="p-2.5 w-[90px] text-right">SỐ KG</th>
                <th className="p-2.5 w-[80px] text-right">SỐ M³</th>
                <th className="p-2.5 w-[110px] text-center">TRẠNG THÁI</th>
                <th className="p-2.5 w-[120px] text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tìm kiếm dữ liệu hàng trong kho...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Không tìm thấy lô hàng nào phù hợp với từ khóa &ldquo;{search}&rdquo;
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const isAlreadySelected = selectedOrderCodes.includes(row.orderCode);
                  const isStored = row.status === 'INBOUND' || row.status === 'LUU_KHO';

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.orderCode}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {row.goodsDescription || 'Hàng hóa tổng quan'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.totalQuantity ?? 1}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.totalWeight?.toLocaleString('vi-VN')} kg
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.totalVolume?.toLocaleString('vi-VN')} m³
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={
                            isStored
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                              : 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                          }
                        >
                          {isStored ? 'LƯU KHO' : row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center">
                        {isAlreadySelected ? (
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center justify-center gap-1">
                            <IconCheck className="h-3.5 w-3.5 text-green-600" /> Đã chọn
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleRowSelect(row)}
                            className="h-7 px-2.5 text-xs bg-[#0F3D62] text-white hover:bg-[#0c314f] font-semibold"
                          >
                            Chọn đơn này <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar ── */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Hiển thị {data.length} / {meta.total} lô hàng
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
            <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
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

        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose}>
            <IconX className="mr-1.5 h-4 w-4" /> Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
