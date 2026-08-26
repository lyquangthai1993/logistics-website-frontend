import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral
} from 'nuqs/server';

export const NOTIFICATION_TABS = ['all', 'unread', 'read'] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TYPES = ['all', 'DISPATCHER', 'FLEET', 'WAREHOUSE', 'GENERIC'] as const;
export type NotificationTypeFilter = (typeof NOTIFICATION_TYPES)[number];

export const notificationsSearchParams = {
  tab: parseAsStringLiteral(NOTIFICATION_TABS).withDefault('all'),
  type: parseAsStringLiteral(NOTIFICATION_TYPES).withDefault('all'),
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(20)
};

export const notificationsSearchParamsCache = createSearchParamsCache(notificationsSearchParams);
export const notificationsSerialize = createSerializer(notificationsSearchParams);
