'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationCard } from '@/components/ui/notification-card';
import { useNotificationSocket } from '../hooks/use-notification-socket';
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation
} from '../hooks/use-notifications-query';

const PAGE_SIZE = 5;

export function NotificationCenter() {
  // Kết nối WebSocket real-time (singleton — chỉ tạo 1 socket dù gọi nhiều lần)
  useNotificationSocket();

  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, isFetching } = useNotificationsQuery(1, limit);
  const { data: unreadCountData } = useUnreadCountQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const notifications = Array.isArray(data?.data) ? data.data : [];
  const total = data?.total ?? 0;
  const hasMore = notifications.length < total;
  const unreadCount =
    typeof unreadCountData === 'number'
      ? unreadCountData
      : notifications.filter((n) => !n.isRead).length;

  const handleLoadMore = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLimit((prev) => prev + PAGE_SIZE);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            aria-label='Thông báo'
            className='relative h-8 w-8 cursor-pointer'
          />
        }
      >
        <Icons.notification className='h-4 w-4' />
        {unreadCount > 0 && (
          <span className='bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className='sr-only'>Thông báo</span>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='w-[calc(100vw-2rem)] p-0 sm:w-[360px] flex flex-col max-h-[480px] overflow-hidden'
        sideOffset={8}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-3.5 py-2.5 shrink-0'>
          <Link
            href='/dashboard/notifications'
            className='group flex items-center gap-1 cursor-pointer'
          >
            <h4 className='text-xs font-semibold group-hover:underline'>Thông báo</h4>
            <Icons.chevronRight className='text-muted-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
          </Link>
          <div className='flex items-center gap-2'>
            {unreadCount > 0 && (
              <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium'>
                {unreadCount} mới
              </span>
            )}
            {unreadCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground hover:text-foreground h-auto px-1.5 py-0.5 text-[11px] cursor-pointer'
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                Đọc tất cả
              </Button>
            )}
          </div>
        </div>
        <Separator className='shrink-0' />

        {/* List content */}
        <ScrollArea className='flex-1 max-h-[320px] min-h-[140px] overflow-y-auto'>
          {isLoading ? (
            <div className='flex items-center justify-center py-10'>
              <Icons.spinner className='text-muted-foreground h-4 w-4 animate-spin' />
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-10'>
              <Icons.notification className='text-muted-foreground/40 mb-1.5 h-6 w-6' />
              <p className='text-muted-foreground text-xs'>Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className='flex flex-col gap-1 p-1.5'>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={String(notification.id)}
                  title={notification.title}
                  body={notification.body}
                  type={notification.type}
                  status={notification.isRead ? 'read' : 'unread'}
                  createdAt={notification.createdAt}
                  compact
                  onMarkAsRead={(id) => markAsRead.mutate(Number(id))}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with Load more / View all link */}
        {notifications.length > 0 && (
          <>
            <Separator className='shrink-0' />
            <div className='p-1.5 bg-muted/20 flex flex-col gap-1 shrink-0'>
              {hasMore ? (
                <Button
                  variant='ghost'
                  size='sm'
                  className='w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 cursor-pointer flex items-center justify-center gap-1.5 h-7'
                  onClick={handleLoadMore}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Icons.spinner className='h-3 w-3 animate-spin' />
                      <span>Đang tải thêm...</span>
                    </>
                  ) : (
                    <>
                      <span>Tải thêm ({notifications.length}/{total})</span>
                      <Icons.chevronDown className='h-3 w-3' />
                    </>
                  )}
                </Button>
              ) : (
                <Link
                  href='/dashboard/notifications'
                  className='w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 font-medium transition-colors'
                >
                  Xem tất cả ({total}) thông báo →
                </Link>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
