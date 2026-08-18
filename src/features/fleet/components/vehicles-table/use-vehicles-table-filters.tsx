'use client';

import { searchParams } from '@/lib/searchparams';
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';

export function useVehiclesTableFilters() {
  const [search, setSearch] = useQueryState(
    'search',
    searchParams.search.withOptions({ shallow: true, throttleMs: 300 }).withDefault('')
  );

  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    searchParams.status.withOptions({ shallow: true }).withDefault('')
  );

  const [typeFilter, setTypeFilter] = useQueryState(
    'type',
    searchParams.type.withOptions({ shallow: true }).withDefault('')
  );

  const [page, setPage] = useQueryState(
    'page',
    searchParams.page.withOptions({ shallow: true }).withDefault(1)
  );

  const resetFilters = useCallback(() => {
    setSearch(null);
    setStatusFilter(null);
    setTypeFilter(null);
    setPage(1);
  }, [setSearch, setStatusFilter, setTypeFilter, setPage]);

  const isAnyFilterActive = useMemo(() => {
    return !!search || !!statusFilter || !!typeFilter;
  }, [search, statusFilter, typeFilter]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    resetFilters,
    isAnyFilterActive
  };
}
