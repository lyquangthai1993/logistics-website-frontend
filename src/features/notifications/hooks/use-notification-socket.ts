'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { getQueryClient } from '@/lib/query-client';
import { toast } from 'sonner';

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

      sharedSocket.on(
        'notification:new',
        (notification: {
          id: number;
          title: string;
          body: string;
          type: string;
          isRead: boolean;
          createdAt: string;
        }) => {
          // Invalidate cache → TanStack Query tự refetch
          const queryClient = getQueryClient();
          void queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Toast thông báo
          toast(notification.title, {
            description: notification.body,
            duration: 5000
          });
        }
      );
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
