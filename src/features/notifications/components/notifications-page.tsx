'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationSocket } from '../hooks/use-notification-socket';
import { extractNotificationTarget } from '../utils/navigation';
import {
  useNotificationsQuery,
  useNotificationStatsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type NotificationItem
} from '../hooks/use-notifications-query';
import { useNotificationsFilters } from '../hooks/use-notifications-filters';
import { notificationsInfoContent } from '../info-content';
import type { NotificationTab, NotificationTypeFilter } from '../params';

const DOMAIN_TYPE_OPTIONS: Array<{
  value: NotificationTypeFilter;
  label: string;
  icon: keyof typeof Icons;
  colorClass: string;
}> = [
  { value: 'all', label: 'Tất cả nghiệp vụ', icon: 'table', colorClass: 'text-foreground' },
  { value: 'DISPATCHER', label: 'Điều phối đơn hàng', icon: 'truck', colorClass: 'text-blue-500' },
  { value: 'FLEET', label: 'Đội xe & Chuyến xe', icon: 'warning', colorClass: 'text-amber-500' },
  { value: 'WAREHOUSE', label: 'Kho bãi', icon: 'package', colorClass: 'text-emerald-500' },
  { value: 'GENERIC', label: 'Hệ thống', icon: 'settings', colorClass: 'text-slate-500' }
];

export default function NotificationsPage() {
  const router = useRouter();
  // Kết nối WebSocket real-time (singleton)
  useNotificationSocket();

  const {
    tab,
    type,
    search,
    page,
    perPage,
    setTab,
    setType,
    setSearch,
    setPage,
    resetFilters,
    isAnyFilterActive
  } = useNotificationsFilters();

  const isReadParam = tab === 'unread' ? false : tab === 'read' ? true : undefined;

  // 100% Server-side Pagination & Filtering trực tiếp từ Database
  const { data, isLoading, isFetching } = useNotificationsQuery({
    page,
    limit: perPage,
    type: type !== 'all' ? type : undefined,
    isRead: isReadParam,
    search: search || undefined
  });

  // API Thống kê số lượng tổng thể theo nghiệp vụ & trạng thái
  const { data: statsData } = useNotificationStatsQuery();
  const { data: unreadCountData } = useUnreadCountQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? (Math.ceil(total / perPage) || 1);

  // Đếm số lượng unread tổng thể
  const totalUnreadGlobal =
    typeof unreadCountData === 'number' ? unreadCountData : (statsData?.unread ?? 0);

  const handleNotificationClick = (notification: NotificationItem) => {
    // 1. Tự động đánh dấu đã đọc nếu chưa đọc
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // 2. Chuyển hướng đến chi tiết đơn hàng nếu có orderId/orderCode
    const target = extractNotificationTarget(notification);
    if (target.url) {
      router.push(target.url);
    }
  };

  const renderList = (items: NotificationItem[]) => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center py-16'>
          <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16 border rounded-xl border-dashed bg-muted/10'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm font-medium'>
            {isAnyFilterActive
              ? 'Không tìm thấy thông báo nào khớp với bộ lọc'
              : 'Chưa có thông báo nào'}
          </p>
          {isAnyFilterActive && (
            <Button
              variant='outline'
              size='sm'
              className='mt-3 cursor-pointer text-xs'
              onClick={resetFilters}
            >
              <Icons.refresh className='mr-1.5 h-3.5 w-3.5' />
              Xóa tất cả bộ lọc
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => {
          const target = extractNotificationTarget(notification);
          return (
            <NotificationCard
              key={notification.id}
              id={String(notification.id)}
              title={notification.title}
              body={notification.body}
              type={notification.type}
              status={notification.isRead ? 'read' : 'unread'}
              createdAt={notification.createdAt}
              orderCode={target.orderCode}
              onClick={target.url ? () => handleNotificationClick(notification) : undefined}
              onMarkAsRead={(id) => markAsRead.mutate(Number(id))}
            />
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer
      pageTitle='Thông báo'
      pageDescription='Trung tâm theo dõi và phân loại các thông báo vận hành Logistics TMS.'
      infoContent={notificationsInfoContent}
      pageHeaderAction={
        totalUnreadGlobal > 0 ? (
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer'
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <Icons.check className='mr-1.5 h-4 w-4' />
            Đánh dấu tất cả đã đọc ({totalUnreadGlobal})
          </Button>
        ) : undefined
      }
    >
      {/* ── Toolbar Lọc & Tìm kiếm Phân loại ── */}
      <div className='flex flex-col gap-3 mb-5'>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
          {/* Ô Tìm kiếm */}
          <div className='relative flex-1 max-w-md'>
            <Icons.search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Tìm kiếm theo tiêu đề, nội dung, mã đơn...'
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-9 pr-8 text-sm h-9 bg-background'
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5'
                aria-label='Clear search'
              >
                <Icons.close className='h-3.5 w-3.5' />
              </button>
            )}
          </div>

          {/* Reset filter button nếu có filter đang active */}
          {isAnyFilterActive && (
            <Button
              variant='ghost'
              size='sm'
              className='text-xs text-muted-foreground hover:text-foreground cursor-pointer h-9 shrink-0'
              onClick={resetFilters}
            >
              <Icons.refresh className='mr-1.5 h-3.5 w-3.5' />
              Đặt lại bộ lọc
            </Button>
          )}
        </div>

        {/* ── Phân loại theo Nghiệp vụ (Domain Type Pills kèm Count) ── */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none'>
          <span className='text-xs font-medium text-muted-foreground shrink-0 mr-1 flex items-center gap-1'>
            <Icons.panelLeft className='h-3.5 w-3.5' />
            Phân loại:
          </span>
          {DOMAIN_TYPE_OPTIONS.map((opt) => {
            const IconComp = Icons[opt.icon] || Icons.notification;
            const isSelected = type === opt.value;
            const count =
              opt.value === 'all'
                ? (statsData?.total ?? total)
                : (statsData?.byType[opt.value] ?? 0);

            return (
              <Button
                key={opt.value}
                variant={isSelected ? 'default' : 'outline'}
                size='sm'
                className={`h-7 px-2.5 text-xs rounded-full shrink-0 cursor-pointer transition-all ${
                  isSelected
                    ? 'shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                onClick={() => setType(opt.value)}
              >
                <IconComp
                  className={`h-3 w-3 mr-1.5 ${isSelected ? 'text-primary-foreground' : opt.colorClass}`}
                />
                <span>{opt.label}</span>
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Tabs Trạng thái (Tất cả / Chưa đọc / Đã đọc kèm Count) ── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as NotificationTab)}>
        <TabsList className='grid grid-cols-3 max-w-sm'>
          <TabsTrigger value='all' className='cursor-pointer text-xs'>
            Tất cả ({type === 'all' ? (statsData?.total ?? total) : (statsData?.byType[type] ?? 0)})
          </TabsTrigger>
          <TabsTrigger value='unread' className='cursor-pointer text-xs'>
            Chưa đọc (
            {type === 'all' ? (statsData?.unread ?? 0) : (statsData?.unreadByType[type] ?? 0)})
          </TabsTrigger>
          <TabsTrigger value='read' className='cursor-pointer text-xs'>
            Đã đọc (
            {type === 'all'
              ? (statsData?.read ?? 0)
              : Math.max(0, (statsData?.byType[type] ?? 0) - (statsData?.unreadByType[type] ?? 0))}
            )
          </TabsTrigger>
        </TabsList>

        <div className='mt-4'>
          <TabsContent value='all' className='m-0'>
            {renderList(notifications)}
          </TabsContent>
          <TabsContent value='unread' className='m-0'>
            {renderList(notifications)}
          </TabsContent>
          <TabsContent value='read' className='m-0'>
            {renderList(notifications)}
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Phân trang (Pagination) ── */}
      {totalPages > 1 && (
        <div className='mt-6 flex items-center justify-between border-t pt-4'>
          <p className='text-xs text-muted-foreground'>
            Hiển thị {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} trong số {total}{' '}
            thông báo
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='cursor-pointer disabled:cursor-not-allowed h-8 text-xs'
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              <Icons.chevronLeft className='h-3.5 w-3.5 mr-1' />
              Trước
            </Button>
            <span className='text-muted-foreground text-xs font-medium px-1'>
              Trang {page} / {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              className='cursor-pointer disabled:cursor-not-allowed h-8 text-xs'
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
              <Icons.chevronRight className='h-3.5 w-3.5 ml-1' />
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
