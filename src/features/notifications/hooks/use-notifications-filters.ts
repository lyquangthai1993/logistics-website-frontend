'use client';

import { useQueryStates, parseAsInteger, parseAsStringLiteral } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { NOTIFICATION_TABS, type NotificationTab } from '../params';

export function useNotificationsFilters() {
  const [params, setParams] = useQueryStates({
    tab: parseAsStringLiteral(NOTIFICATION_TABS).withDefault('all'),
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(20)
  });

  const setTab = useCallback(
    (newTab: NotificationTab) => {
      setParams({ tab: newTab, page: 1 });
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
      page: 1,
      perPage: 20
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return params.tab !== 'all' || params.page > 1;
  }, [params]);

  return {
    tab: params.tab,
    page: params.page,
    perPage: params.perPage,
    setTab,
    setPage,
    setParams,
    resetFilters,
    isAnyFilterActive
  };
}
