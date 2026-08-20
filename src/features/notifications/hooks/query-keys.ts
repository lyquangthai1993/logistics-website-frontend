export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) =>
    [...notificationKeys.lists(), params ?? {}] as const,
  infinite: () => [...notificationKeys.all, 'infinite'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
};
