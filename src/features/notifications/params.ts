import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral
} from 'nuqs/server';

export const NOTIFICATION_TABS = ['all', 'unread', 'read'] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const notificationsSearchParams = {
  tab: parseAsStringLiteral(NOTIFICATION_TABS).withDefault('all'),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(20)
};

export const notificationsSearchParamsCache = createSearchParamsCache(notificationsSearchParams);
export const notificationsSerialize = createSerializer(notificationsSearchParams);
