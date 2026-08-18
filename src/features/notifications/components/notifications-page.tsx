'use client';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationSocket } from '../hooks/use-notification-socket';
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  type NotificationItem
} from '../hooks/use-notifications-query';
import { useNotificationsFilters } from '../hooks/use-notifications-filters';
import { notificationsInfoContent } from '../info-content';
import type { NotificationTab } from '../params';

export default function NotificationsPage() {
  // Kết nối WebSocket real-time (singleton)
  useNotificationSocket();

  const { tab, page, perPage, setTab, setPage } = useNotificationsFilters();
  const { data, isLoading, isFetching } = useNotificationsQuery(page, perPage);
  const { data: unreadCountData } = useUnreadCountQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / perPage) || 1;

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const readNotifications = notifications.filter((n) => n.isRead);
  const unreadCount = typeof unreadCountData === 'number' ? unreadCountData : unreadNotifications.length;
  const readCount = Math.max(0, total - unreadCount);

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
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>No notifications</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => (
          <NotificationCard
            key={notification.id}
            id={String(notification.id)}
            title={notification.title}
            body={notification.body}
            type={notification.type}
            status={notification.isRead ? 'read' : 'unread'}
            createdAt={notification.createdAt}
            onMarkAsRead={(id) => markAsRead.mutate(Number(id))}
          />
        ))}
      </div>
    );
  };

  return (
    <PageContainer
      pageTitle='Notifications'
      pageDescription='View and manage all your notifications.'
      infoContent={notificationsInfoContent}
      pageHeaderAction={
        unreadCount > 0 ? (
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer'
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as NotificationTab)}>
        <TabsList>
          <TabsTrigger value='all' className='cursor-pointer'>
            All ({total})
          </TabsTrigger>
          <TabsTrigger value='unread' className='cursor-pointer'>
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value='read' className='cursor-pointer'>
            Read ({readCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(notifications)}
        </TabsContent>
        <TabsContent value='unread' className='mt-4'>
          {renderList(unreadNotifications)}
        </TabsContent>
        <TabsContent value='read' className='mt-4'>
          {renderList(readNotifications)}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6 flex items-center justify-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer disabled:cursor-not-allowed'
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            <Icons.chevronLeft className='h-4 w-4' />
            Prev
          </Button>
          <span className='text-muted-foreground text-sm'>
            Page {page} / {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer disabled:cursor-not-allowed'
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <Icons.chevronRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
