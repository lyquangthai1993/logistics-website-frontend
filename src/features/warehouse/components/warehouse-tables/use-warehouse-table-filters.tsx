'use client';

import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { useCallback, useMemo } from 'react';
import type { QueryTripParams } from '@/features/trips/api/types';

export function useWarehouseTableFilters(columnIds: string[] = []) {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    tripSequence: parseAsString,
    search: parseAsString,
    name: parseAsString,
    hub: parseAsString,
    hubId: parseAsString,
    destinationHub: parseAsString,
    status: parseAsString.withDefault('ALL'),
    view: parseAsString.withDefault('table'),
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const search = params.tripSequence || params.name || params.search || '';
  const selectedHub = params.hub || params.destinationHub || params.hubId || 'ALL';
  const selectedStatus = params.status || 'ALL';
  const currentView = (params.view as 'table' | 'cards') || 'table';

  const filters: QueryTripParams = useMemo(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(selectedHub !== 'ALL' ? { hub: selectedHub } : {}),
      ...(selectedStatus !== 'ALL' ? { status: selectedStatus as any } : {}),
      ...(params.sort && params.sort.length > 0 ? { sort: JSON.stringify(params.sort) } : {})
    }),
    [params.page, params.perPage, search, selectedHub, selectedStatus, params.sort]
  );

  const resetFilters = useCallback(() => {
    setParams({
      tripSequence: null,
      search: null,
      name: null,
      hub: null,
      hubId: null,
      destinationHub: null,
      status: 'ALL',
      page: 1
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(
      params.tripSequence ||
      params.search ||
      params.name ||
      (params.hub && params.hub !== 'ALL') ||
      (params.destinationHub && params.destinationHub !== 'ALL') ||
      (params.status && params.status !== 'ALL')
    );
  }, [params]);

  const setView = useCallback(
    (view: 'table' | 'cards') => {
      setParams({ view });
    },
    [setParams]
  );

  const setSelectedHub = useCallback(
    (hub: string) => {
      setParams({ hub: hub === 'ALL' ? null : hub, page: 1 });
    },
    [setParams]
  );

  const setSelectedStatus = useCallback(
    (status: string) => {
      setParams({ status: status === 'ALL' ? null : status, page: 1 });
    },
    [setParams]
  );

  return {
    params,
    setParams,
    search,
    selectedHub,
    selectedStatus,
    currentView,
    setView,
    setSelectedHub,
    setSelectedStatus,
    filters,
    resetFilters,
    isAnyFilterActive
  };
}
