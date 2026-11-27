'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconLoader2,
  IconPencil,
  IconRefresh,
  IconSearch
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/layout/page-container';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager } from '@/lib/token-manager';
import { renderWarehouseOrderStatusBadge } from '@/features/warehouse/components/warehouse-tables/columns';
import { WarehouseHubFilterSelect } from '@/features/warehouse/components/warehouse-hub-filter-select';
import {
  WarehouseWaybillDetailModal,
  WaybillDetailData
} from '@/features/warehouse/components/warehouse-waybill-detail-modal';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
}

function resolveDisplayStatus(row: any) {
  const stock = Math.max(0, Number(row.hubStock ?? row.remainingQuantity ?? 0));
  const status = String(row.hubStatus ?? row.status ?? '').toUpperCase();
  if (stock === 0 && ['INBOUND', 'STORED', 'LUU_KHO', 'IN_WAREHOUSE'].includes(status)) {
    return 'COMPLETED_INBOUND';
  }
  return row.hubStatus ?? row.status;
}

export default function AdminEditQueuePage() {
  const user = useAuthStore((state) => state.user);
  const role =
    typeof user?.role === 'object' && user.role !== null ? (user.role as any) : user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN' || role?.id === 1 || role?.name === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hubId, setHubId] = useState('ALL');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillDetailData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchQueue = useCallback(() => {
    if (!isSuperAdmin) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    const query = new URLSearchParams({
      page: String(page),
      limit: '20',
      groupBy: 'orderCode',
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(hubId !== 'ALL' ? { hubId } : {})
    });
    const token = tokenManager.getAccessToken();

    fetch(`/api/v1/warehouse/orders?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: controller.signal
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => {
        if (controller.signal.aborted) return;
        setRows(payload?.data ?? []);
        setTotal(Number(payload?.meta?.total ?? payload?.data?.length ?? 0));
        setTotalPages(Math.max(1, Number(payload?.meta?.totalPages ?? 1)));
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || controller.signal.aborted) return;
        setRows([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }, [appliedSearch, hubId, isSuperAdmin, page, statusFilter]);

  useEffect(() => {
    fetchQueue();
    return () => abortRef.current?.abort();
  }, [fetchQueue]);

  const submitSearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const openDetail = (row: any) => {
    setSelectedWaybill(row);
    setIsDetailModalOpen(true);
  };

  return (
    <PageContainer
      access={isSuperAdmin}
      accessFallback={
        <div className='p-2 text-sm text-slate-500'>
          Chỉ Super Admin được truy cập hàng đợi chỉnh sửa.
        </div>
      }
      pageTitle='Hàng đợi chỉnh sửa'
      pageDescription='Rà soát và điều chỉnh thông tin mọi đơn hàng bằng quyền Super Admin.'
      pageHeaderAction={
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 text-xs'
          onClick={fetchQueue}
          disabled={isLoading}
        >
          <IconRefresh className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      }
    >
      <div className='space-y-2'>
        <Card
          className='border-blue-200 bg-blue-50/40 py-0 dark:border-blue-900/60 dark:bg-blue-950/20'
          data-testid='admin-edit-queue-mvp'
        >
          <CardHeader className='flex flex-row items-center justify-between gap-2 border-b border-blue-100 px-2 py-1.5 dark:border-blue-900/50'>
            <CardTitle className='flex items-center gap-1.5 text-sm text-[#0F3D62] dark:text-blue-300'>
              <IconPencil className='h-4 w-4' />
              Danh sách đơn cần rà soát
            </CardTitle>
            <Badge
              variant='outline'
              className='border-blue-200 bg-white text-[10px] text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300'
            >
              {total} đơn phù hợp
            </Badge>
          </CardHeader>
          <CardContent className='space-y-2 p-1'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <div className='relative min-w-64 flex-1'>
                <IconSearch className='absolute left-2 top-2 h-3.5 w-3.5 text-slate-400' />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
                  placeholder='Tìm theo mã đơn hoặc tên hàng hóa'
                  className='h-8 pl-7 text-xs'
                  data-testid='admin-edit-queue-search'
                />
              </div>
              <Button type='button' size='sm' className='h-8 text-xs' onClick={submitSearch}>
                Tìm kiếm
              </Button>
              <WarehouseHubFilterSelect
                value={hubId}
                onChange={(value) => {
                  setHubId(value);
                  setPage(1);
                }}
                testIdPrefix='admin-edit-queue-hub'
              />
            </div>

            <div className='flex flex-wrap items-center gap-1'>
              {['ALL', 'INBOUND', 'DRAFT', 'COMPLETED_INBOUND'].map((status) => (
                <button
                  key={status}
                  type='button'
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold ${statusFilter === status ? 'bg-[#0F3D62] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                  data-testid={`admin-edit-queue-status-${status.toLowerCase()}`}
                >
                  {status === 'ALL'
                    ? 'Tất cả'
                    : status === 'INBOUND'
                      ? 'Lưu kho'
                      : status === 'DRAFT'
                        ? 'Đơn nháp'
                        : 'Đã xuất kho'}
                </button>
              ))}
              <span className='ml-auto text-[10px] text-slate-500'>
                Không lọc theo ngày; tìm trên toàn bộ đơn.
              </span>
            </div>

            <div className='overflow-x-auto rounded-md border border-blue-100 bg-white dark:border-blue-900/50 dark:bg-slate-900'>
              <table className='w-full min-w-[820px] text-left text-[10px]'>
                <thead className='bg-slate-50 text-[10px] uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300'>
                  <tr>
                    <th className='px-2 py-1.5'>Mã đơn</th>
                    <th className='px-2 py-1.5'>Tên hàng hóa</th>
                    <th className='px-2 py-1.5'>Trạng thái</th>
                    <th className='px-2 py-1.5'>Hub hiện tại</th>
                    <th className='px-2 py-1.5'>Cập nhật gần nhất</th>
                    <th className='px-2 py-1.5 text-center'>Thao tác</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className='px-2 py-5 text-center text-slate-500'>
                        <IconLoader2 className='mx-auto h-4 w-4 animate-spin' />
                        Đang tải hàng đợi...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-2 py-5 text-center text-slate-500'>
                        Không có đơn phù hợp.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr
                        key={`${row.orderCode}-${row.id}`}
                        className='hover:bg-blue-50/60 dark:hover:bg-blue-950/20'
                      >
                        <td className='px-2 py-1.5 font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300'>
                          {row.orderCode}
                        </td>
                        <td
                          className='max-w-56 truncate px-2 py-1.5 font-medium'
                          title={row.goodsDescription || 'Hàng tổng hợp'}
                        >
                          {row.goodsDescription || 'Hàng tổng hợp'}
                        </td>
                        <td className='px-2 py-1.5'>
                          {renderWarehouseOrderStatusBadge(resolveDisplayStatus(row))}
                        </td>
                        <td className='px-2 py-1.5 text-slate-600 dark:text-slate-300'>
                          {row.currentHubEntity?.name ||
                            row.originHub ||
                            row.currentHubName ||
                            'Chưa xác định'}
                        </td>
                        <td className='px-2 py-1.5 font-mono text-slate-500 dark:text-slate-400'>
                          {formatDate(row.updatedAt || row.createdAt)}
                        </td>
                        <td className='px-2 py-1.5 text-center'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            className='h-7 gap-1 border-blue-200 px-2 text-[10px] font-bold text-blue-700 dark:border-blue-800 dark:text-blue-300'
                            onClick={() => openDetail(row)}
                            data-testid={`admin-edit-queue-open-${row.orderCode}`}
                          >
                            <IconPencil className='h-3 w-3' />
                            Mở chỉnh sửa
                            <IconArrowRight className='h-3 w-3' />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className='flex items-center justify-between border-t border-slate-100 pt-1 text-[10px] text-slate-500 dark:border-slate-800'>
              <span>
                Trang {page}/{totalPages} · Hiển thị {rows.length} đơn
              </span>
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-[10px]'
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trước
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-[10px]'
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WarehouseWaybillDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        waybill={selectedWaybill}
        onSuccess={(updatedOrder) => {
          void fetchQueue();
          if (updatedOrder) {
            setSelectedWaybill((current) => (current ? { ...current, ...updatedOrder } : current));
          }
        }}
        warehouseHubId={hubId !== 'ALL' ? Number(hubId) : null}
      />
    </PageContainer>
  );
}
