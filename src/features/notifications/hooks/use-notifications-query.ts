'use client';

import {
  InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { notificationKeys } from './query-keys';

export { notificationKeys };

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

export async function fetchNotifications(
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

  const rawMeta =
    res.data.meta ||
    (typeof rawData === 'object' && rawData !== null && 'total' in rawData
      ? (rawData as any)
      : null);
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
 * placeholderData: keepPreviousData → tránh giật lag khi chuyển trang / đổi bộ lọc
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
    queryKey: notificationKeys.list(normalizedParams as Record<string, unknown>),
    queryFn: () => fetchNotifications(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

/**
 * Infinite query dành riêng cho Notification Center Popover (Tải thêm mượt mà)
 */
export function useInfiniteNotificationsQuery(limit = 10) {
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(),
    queryFn: ({ pageParam = 1 }) => fetchNotifications({ page: pageParam as number, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page ?? 1;
      const currentLimit = lastPage.limit ?? limit;
      const total = lastPage.total ?? 0;
      if (currentPage * currentLimit < total) {
        return currentPage + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000
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
    queryKey: notificationKeys.stats(),
    queryFn: fetchNotificationStats,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

/** Count unread — dùng cho badge chuông thông báo */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true
  });
}

/**
 * Mark single notification as read với cơ chế OPTIMISTIC UPDATE
 * Cập nhật tức thì 0ms: Badge chuông, Card status, Stats cache
 * Tự động Rollback an toàn nếu API thất bại
 */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.patch<ApiResponse<any>>(`/api/v1/notifications/${id}/read`);
      return res.data;
    },
    onMutate: async (id: number) => {
      // 1. Hủy các query đang fetch dở để tránh ghi đè dữ liệu lạc quan
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // 2. Snapshot cache hiện tại để rollback khi có lỗi
      const previousLists = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.lists()
      });
      const previousInfinite = queryClient.getQueriesData<InfiniteData<NotificationsResponse>>({
        queryKey: notificationKeys.infinite()
      });
      const previousUnreadCount = queryClient.getQueryData<number>(notificationKeys.unreadCount());
      const previousStats = queryClient.getQueryData<NotificationStats>(notificationKeys.stats());

      // Tìm thông báo mục tiêu để biết loại type
      let targetNotification: NotificationItem | undefined;
      for (const [, listData] of previousLists) {
        const found = listData?.data?.find((item) => item.id === id);
        if (found) {
          targetNotification = found;
          break;
        }
      }

      // 3. Optimistic Update: Giảm unread count ngay lập tức
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), (old) =>
        typeof old === 'number' ? Math.max(0, old - 1) : 0
      );

      // 4. Optimistic Update: Cập nhật từng danh sách phân trang (Lists) theo ngữ cảnh bộ lọc
      previousLists.forEach(([queryKey]) => {
        const queryParams = (queryKey[2] as FetchNotificationsParams) || {};
        queryClient.setQueryData<NotificationsResponse>(queryKey, (oldData) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;

          // TH1: Query cho tab "Chưa đọc" (isRead: false)
          // -> Item này lập tức bị loại bỏ khỏi danh sách Chưa đọc (0ms)
          if (queryParams.isRead === false) {
            const hasItem = oldData.data.some((item) => item.id === id);
            if (!hasItem) return oldData;
            return {
              ...oldData,
              total: Math.max(0, oldData.total - 1),
              data: oldData.data.filter((item) => item.id !== id)
            };
          }

          // TH2: Query cho tab "Đã đọc" (isRead: true)
          // -> Chèn item này vào đầu danh sách Đã đọc
          if (queryParams.isRead === true) {
            if (targetNotification && !oldData.data.some((i) => i.id === id)) {
              return {
                ...oldData,
                total: oldData.total + 1,
                data: [{ ...targetNotification, isRead: true }, ...oldData.data]
              };
            }
            return oldData;
          }

          // TH3: Query cho tab "Tất cả" (isRead: undefined)
          // -> Giữ nguyên vị trí trong list, cập nhật isRead = true
          return {
            ...oldData,
            data: oldData.data.map((item) => (item.id === id ? { ...item, isRead: true } : item))
          };
        });
      });

      // 5. Optimistic Update: Cập nhật trong infinite query cache (Popover chuông)
      queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
        { queryKey: notificationKeys.infinite() },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.pages)) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((item) => (item.id === id ? { ...item, isRead: true } : item))
                : page.data
            }))
          };
        }
      );

      // 6. Optimistic Update: Cập nhật stats
      queryClient.setQueryData<NotificationStats>(notificationKeys.stats(), (old) => {
        if (!old) return old;
        const updated = {
          ...old,
          unread: Math.max(0, old.unread - 1),
          read: old.read + 1,
          unreadByType: { ...old.unreadByType }
        };
        const itemType = targetNotification?.type;
        if (itemType && updated.unreadByType[itemType] !== undefined) {
          updated.unreadByType[itemType] = Math.max(0, updated.unreadByType[itemType] - 1);
        }
        return updated;
      });

      return { previousLists, previousInfinite, previousUnreadCount, previousStats };
    },
    onError: (err: unknown, _id, context) => {
      // Rollback về snapshot cũ khi có lỗi mạng/server
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(notificationKeys.stats(), context.previousStats);
      }
      showApiErrorToast(err, 'Không thể đánh dấu thông báo là đã đọc. Vui lòng thử lại.');
    },
    onSettled: (data) => {
      // Đồng bộ lại với DB Backend
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (data && !data.silent) {
        showApiSuccessToast('Đã đánh dấu thông báo là đã đọc');
      }
    }
  });
}

/**
 * Mark all notifications as read với cơ chế OPTIMISTIC UPDATE
 */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.patch('/api/v1/notifications/read-all'),
    onMutate: async () => {
      // 1. Hủy query in-flight
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // 2. Snapshot
      const previousLists = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.lists()
      });
      const previousInfinite = queryClient.getQueriesData<InfiniteData<NotificationsResponse>>({
        queryKey: notificationKeys.infinite()
      });
      const previousUnreadCount = queryClient.getQueryData<number>(notificationKeys.unreadCount());
      const previousStats = queryClient.getQueryData<NotificationStats>(notificationKeys.stats());

      // 3. Đặt badge về 0 tức thì
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);

      // 4. Cập nhật tất cả danh sách phân trang
      previousLists.forEach(([queryKey]) => {
        const queryParams = (queryKey[2] as FetchNotificationsParams) || {};
        queryClient.setQueryData<NotificationsResponse>(queryKey, (oldData) => {
          if (!oldData || !Array.isArray(oldData.data)) return oldData;

          // Tab Chưa đọc -> Làm rỗng lập tức (0ms)
          if (queryParams.isRead === false) {
            return {
              ...oldData,
              total: 0,
              data: []
            };
          }

          // Tab Đã đọc hoặc Tất cả -> Toàn bộ isRead = true
          return {
            ...oldData,
            data: oldData.data.map((item) => ({ ...item, isRead: true }))
          };
        });
      });

      // 5. Cập nhật infinite query
      queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
        { queryKey: notificationKeys.infinite() },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.pages)) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((item) => ({ ...item, isRead: true }))
                : page.data
            }))
          };
        }
      );

      // 6. Cập nhật stats
      queryClient.setQueryData<NotificationStats>(notificationKeys.stats(), (old) => {
        if (!old) return old;
        return {
          ...old,
          unread: 0,
          read: old.total,
          unreadByType: {
            DISPATCHER: 0,
            FLEET: 0,
            WAREHOUSE: 0,
            GENERIC: 0
          }
        };
      });

      return { previousLists, previousInfinite, previousUnreadCount, previousStats };
    },
    onError: (err: unknown, _vars, context) => {
      // Rollback
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(notificationKeys.stats(), context.previousStats);
      }
      showApiErrorToast(err, 'Không thể đánh dấu tất cả thông báo là đã đọc. Vui lòng thử lại.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      showApiSuccessToast('Đã đánh dấu tất cả thông báo là đã đọc');
    }
  });
}
