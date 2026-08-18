'use client';

import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { useCallback, useMemo } from 'react';
import type { HubFilters } from '../../api/types';

export function useHubsTableFilters(columnIds: string[] = []) {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    search: parseAsString,
    status: parseAsString,
    isActive: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const search = params.name || params.search || '';

  let isActive: boolean | undefined = undefined;
  if (params.status === 'active' || params.isActive === 'true' || params.status === 'ACTIVE') {
    isActive = true;
  } else if (params.status === 'inactive' || params.isActive === 'false' || params.status === 'INACTIVE') {
    isActive = false;
  }

  const filters: HubFilters = useMemo(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(params.sort && params.sort.length > 0 ? { sort: JSON.stringify(params.sort) } : {})
    }),
    [params.page, params.perPage, search, isActive, params.sort]
  );

  const resetFilters = useCallback(() => {
    setParams({
      name: null,
      search: null,
      status: null,
      isActive: null,
      page: 1
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(params.name || params.search || params.status || params.isActive);
  }, [params]);

  return {
    params,
    setParams,
    search,
    isActive,
    filters,
    resetFilters,
    isAnyFilterActive
  };
}
