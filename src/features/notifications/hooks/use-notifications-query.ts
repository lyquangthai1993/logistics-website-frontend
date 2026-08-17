'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: 'WAREHOUSE' | 'FLEET' | 'DISPATCHER' | 'GENERIC';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type NotificationsResponse = {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
};

async function fetchNotifications(page: number, limit: number): Promise<NotificationsResponse> {
  const res = await apiClient.get<NotificationsResponse>('/api/v1/notifications', {
    params: { page, limit }
  });
  return res.data;
}

async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<number>('/api/v1/notifications/unread-count');
  return res.data;
}

/**
 * Fetch paginated notification list.
 * staleTime: 30s → backup nếu WebSocket disconnect, data vẫn refresh khi user focus lại tab
 */
export function useNotificationsQuery(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['notifications', { page, limit }],
    queryFn: () => fetchNotifications(page, limit),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

/** Count unread — dùng cho badge */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

/** Mark single notification as read */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

/** Mark all notifications as read */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch('/api/v1/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}
