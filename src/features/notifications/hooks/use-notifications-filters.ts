'use client';

import { useQueryStates, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useCallback, useMemo } from 'react';
import {
  NOTIFICATION_TABS,
  NOTIFICATION_TYPES,
  type NotificationTab,
  type NotificationTypeFilter
} from '../params';

export function useNotificationsFilters() {
  const [params, setParams] = useQueryStates({
    tab: parseAsStringLiteral(NOTIFICATION_TABS).withDefault('all'),
    type: parseAsStringLiteral(NOTIFICATION_TYPES).withDefault('all'),
    search: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(20)
  });

  const setTab = useCallback(
    (newTab: NotificationTab) => {
      setParams({ tab: newTab, page: 1 });
    },
    [setParams]
  );

  const setType = useCallback(
    (newType: NotificationTypeFilter) => {
      setParams({ type: newType, page: 1 });
    },
    [setParams]
  );

  const setSearch = useCallback(
    (newSearch: string) => {
      setParams({ search: newSearch || null, page: 1 });
    },
    [setParams]
  );

  const setPage = useCallback(
    (newPage: number | ((prev: number) => number)) => {
      if (typeof newPage === 'function') {
        setParams((prev) => ({
          page: Math.max(1, newPage(prev.page ?? 1))
        }));
      } else {
        setParams({ page: Math.max(1, newPage) });
      }
    },
    [setParams]
  );

  const resetFilters = useCallback(() => {
    setParams({
      tab: 'all',
      type: 'all',
      search: null,
      page: 1,
      perPage: 20
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return params.tab !== 'all' || params.type !== 'all' || !!params.search || params.page > 1;
  }, [params]);

  return {
    tab: params.tab,
    type: params.type,
    search: params.search,
    page: params.page,
    perPage: params.perPage,
    setTab,
    setType,
    setSearch,
    setPage,
    setParams,
    resetFilters,
    isAnyFilterActive
  };
}
