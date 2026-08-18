'use client';

import { searchParams } from '@/lib/searchparams';
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';

export function useDriversTableFilters() {
  const [search, setSearch] = useQueryState(
    'search',
    searchParams.search.withOptions({ shallow: true, throttleMs: 300 }).withDefault('')
  );

  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    searchParams.status.withOptions({ shallow: true }).withDefault('')
  );

  const [licenseClassFilter, setLicenseClassFilter] = useQueryState(
    'licenseClass',
    searchParams.licenseClass.withOptions({ shallow: true }).withDefault('')
  );

  const [page, setPage] = useQueryState(
    'page',
    searchParams.page.withOptions({ shallow: true }).withDefault(1)
  );

  const resetFilters = useCallback(() => {
    setSearch(null);
    setStatusFilter(null);
    setLicenseClassFilter(null);
    setPage(1);
  }, [setSearch, setStatusFilter, setLicenseClassFilter, setPage]);

  const isAnyFilterActive = useMemo(() => {
    return !!search || !!statusFilter || !!licenseClassFilter;
  }, [search, statusFilter, licenseClassFilter]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    licenseClassFilter,
    setLicenseClassFilter,
    page,
    setPage,
    resetFilters,
    isAnyFilterActive
  };
}
