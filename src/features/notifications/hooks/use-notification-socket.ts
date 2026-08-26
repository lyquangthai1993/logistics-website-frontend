'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { getQueryClient } from '@/lib/query-client';
import { toast } from 'sonner';
import { notificationKeys } from './query-keys';
import type { InfiniteData } from '@tanstack/react-query';
import type { NotificationItem, NotificationsResponse } from './use-notifications-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Singleton socket — chỉ tạo 1 lần cho toàn app */
let sharedSocket: Socket | null = null;
let mountCount = 0;

export function useNotificationSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    mountCount++;

    // Tạo socket mới nếu chưa có hoặc đã disconnect
    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(`${API_URL}/notifications`, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      sharedSocket.on('connect', () => {
        console.log('[WS] Notifications connected:', sharedSocket?.id);
      });

      sharedSocket.on('connect_error', (err) => {
        console.warn('[WS] Notifications connect error:', err.message);
      });

      sharedSocket.on('disconnect', (reason) => {
        console.log('[WS] Notifications disconnected:', reason);
      });

      sharedSocket.on('notification:new', (notification: NotificationItem) => {
        const queryClient = getQueryClient();

        // 1. Tăng unread count tức thì trên cache (+1)
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) => (old ?? 0) + 1);

        // 2. Optimistic insert: Chèn notification mới vào đầu danh sách cache
        queryClient.setQueriesData<NotificationsResponse>(
          { queryKey: notificationKeys.lists() },
          (oldData) => {
            if (!oldData || !Array.isArray(oldData.data)) return oldData;
            // Kiểm tra trùng lặp
            if (oldData.data.some((item) => item.id === notification.id)) return oldData;
            return {
              ...oldData,
              total: oldData.total + 1,
              data: [notification, ...oldData.data]
            };
          }
        );

        // 3. Chèn vào đầu infinite query cache
        queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
          { queryKey: notificationKeys.infinite() },
          (oldData) => {
            if (!oldData || !Array.isArray(oldData.pages) || oldData.pages.length === 0)
              return oldData;
            const firstPage = oldData.pages[0];
            const exists = oldData.pages.some((p) => p.data?.some((i) => i.id === notification.id));
            if (exists) return oldData;

            return {
              ...oldData,
              pages: [
                {
                  ...firstPage,
                  total: (firstPage.total ?? 0) + 1,
                  data: [notification, ...(firstPage.data ?? [])]
                },
                ...oldData.pages.slice(1)
              ]
            };
          }
        );

        // 4. Invalidate stats để đồng bộ số liệu nghiệp vụ
        void queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });

        // 5. Toast thông báo nổi bật
        toast(notification.title, {
          description: notification.body,
          duration: 5000
        });
      });
    }

    return () => {
      mountCount--;
      // Chỉ disconnect khi không còn component nào mount hook
      if (mountCount === 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);
}
