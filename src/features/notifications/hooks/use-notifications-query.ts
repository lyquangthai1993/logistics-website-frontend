'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';

export type NotificationType = 'WAREHOUSE' | 'FLEET' | 'DISPATCHER' | 'GENERIC';

export type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export interface FetchNotificationsParams {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
  search?: string;
}

export type NotificationsResponse = {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
};

async function fetchNotifications(
  params: FetchNotificationsParams = {}
): Promise<NotificationsResponse> {
  const cleanParams: Record<string, unknown> = {};
  if (params.page) cleanParams.page = params.page;
  if (params.limit) cleanParams.limit = params.limit;
  if (params.type && params.type !== 'all') cleanParams.type = params.type;
  if (typeof params.isRead === 'boolean') cleanParams.isRead = params.isRead;
  if (params.search && params.search.trim()) cleanParams.search = params.search.trim();

  const res = await apiClient.get<ApiResponse<NotificationItem[]>>('/api/v1/notifications', {
    params: cleanParams
  });

  const rawData = res.data.data;
  const items: NotificationItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray((rawData as any)?.data)
    ? (rawData as any).data
    : [];

  const rawMeta = res.data.meta || (typeof rawData === 'object' && rawData !== null && 'total' in rawData ? (rawData as any) : null);
  const meta = rawMeta || {
    total: items.length,
    page: params.page || 1,
    limit: params.limit || 20,
    totalPages: 1
  };

  return {
    data: items,
    total: meta.total ?? items.length,
    page: meta.page ?? 1,
    limit: meta.limit ?? 20,
    totalPages: meta.totalPages
  };
}

async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<ApiResponse<number>>('/api/v1/notifications/unread-count');
  return res.data.data;
}

/**
 * Fetch paginated & filtered notification list from server.
 * staleTime: 30s → backup nếu WebSocket disconnect, data vẫn refresh khi user focus lại tab
 */
export function useNotificationsQuery(
  params: FetchNotificationsParams | number = 1,
  limit: number = 20
) {
  const normalizedParams: FetchNotificationsParams =
    typeof params === 'number'
      ? { page: params, limit }
      : { page: params.page ?? 1, limit: params.limit ?? 20, ...params };

  return useQuery({
    queryKey: ['notifications', normalizedParams],
    queryFn: () => fetchNotifications(normalizedParams),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

export type NotificationStats = {
  total: number;
  unread: number;
  read: number;
  byType: {
    DISPATCHER: number;
    FLEET: number;
    WAREHOUSE: number;
    GENERIC: number;
  };
  unreadByType: {
    DISPATCHER: number;
    FLEET: number;
    WAREHOUSE: number;
    GENERIC: number;
  };
};

async function fetchNotificationStats(): Promise<NotificationStats> {
  const res = await apiClient.get<ApiResponse<NotificationStats>>('/api/v1/notifications/stats');
  return res.data.data;
}

/** Thống kê số lượng notification theo nghiệp vụ & trạng thái */
export function useNotificationStatsQuery() {
  return useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: fetchNotificationStats,
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
    mutationFn: async (id: number) => {
      const res = await apiClient.patch<ApiResponse<any>>(`/api/v1/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (!data?.silent) {
        showApiSuccessToast('Đã đánh dấu thông báo là đã đọc');
      }
    },
    onError: (err: unknown) => {
      showApiErrorToast(err, 'Không thể đánh dấu thông báo là đã đọc. Vui lòng thử lại.');
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
      showApiSuccessToast('Đã đánh dấu tất cả thông báo là đã đọc');
    },
    onError: (err: unknown) => {
      showApiErrorToast(err, 'Không thể đánh dấu tất cả thông báo là đã đọc. Vui lòng thử lại.');
    }
  });
}
