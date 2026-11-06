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
    level: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const rawName = Array.isArray(params.name) ? params.name[0] : params.name;
  const rawSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const search = rawName || rawSearch || '';

  const rawStatus = Array.isArray(params.status) ? params.status.join(',') : params.status;
  const rawIsActive = Array.isArray(params.isActive) ? params.isActive.join(',') : params.isActive;
  const statusTokens = (rawStatus || rawIsActive || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let isActive: boolean | undefined = undefined;
  const hasActive = statusTokens.includes('active') || statusTokens.includes('true');
  const hasInactive = statusTokens.includes('inactive') || statusTokens.includes('false');
  if (hasActive && !hasInactive) {
    isActive = true;
  } else if (hasInactive && !hasActive) {
    isActive = false;
  }

  const rawLevel = Array.isArray(params.level) ? params.level.join(',') : params.level;
  const levelTokens = (rawLevel || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => n === 1 || n === 2);
  const level: number | undefined = levelTokens.length === 1 ? levelTokens[0] : undefined;

  const filters: HubFilters = useMemo(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(params.sort && params.sort.length > 0 ? { sort: JSON.stringify(params.sort) } : {})
    }),
    [params.page, params.perPage, search, isActive, level, params.sort]
  );

  const resetFilters = useCallback(() => {
    setParams({
      name: null,
      search: null,
      status: null,
      isActive: null,
      level: null,
      page: 1
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(
      params.name || params.search || params.status || params.isActive || params.level
    );
  }, [params]);

  return {
    params,
    setParams,
    search,
    isActive,
    level,
    filters,
    resetFilters,
    isAnyFilterActive
  };
}
