'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  computeSevenDaysAgoDate,
  computeTodayDate
} from '../components/warehouse-date-range-dropdown';

export interface UseWarehouseBoardFilterSyncOptions {
  defaultStatus?: 'ALL' | 'PENDING' | 'COMPLETED';
}

export function useWarehouseBoardFilterSync(options?: UseWarehouseBoardFilterSyncOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to read query param with optional alias
  const getParam = useCallback(
    (key: string, alias?: string): string => {
      if (searchParams) {
        const val = searchParams.get(key) || (alias ? searchParams.get(alias) : null);
        if (val !== null && val !== undefined) return val;
      }
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const val = sp.get(key) || (alias ? sp.get(alias) : null);
        if (val !== null && val !== undefined) return val;
      }
      return '';
    },
    [searchParams]
  );

  // Initialize values from URL
  const initialSearch = useMemo(() => {
    return (getParam('search', 'q') || '').trim();
  }, [getParam]);

  const initialFromDate = useMemo(() => {
    const val = getParam('fromDate', 'startDate');
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return computeSevenDaysAgoDate();
  }, [getParam]);

  const initialToDate = useMemo(() => {
    const val = getParam('toDate', 'endDate');
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return computeTodayDate();
  }, [getParam]);

  const initialPage = useMemo(() => {
    const p = Number(getParam('page'));
    return p >= 1 ? p : 1;
  }, [getParam]);

  const initialStatus = useMemo(() => {
    const s = getParam('status');
    if (['ALL', 'PENDING', 'COMPLETED'].includes(s)) {
      return s as 'ALL' | 'PENDING' | 'COMPLETED';
    }
    return options?.defaultStatus ?? 'ALL';
  }, [getParam, options?.defaultStatus]);

  // Reactive state
  const [search, setSearch] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [appliedFromDate, setAppliedFromDate] = useState(initialFromDate);
  const [appliedToDate, setAppliedToDate] = useState(initialToDate);
  const [boardStatus, setBoardStatusState] = useState<'ALL' | 'PENDING' | 'COMPLETED'>(initialStatus);
  const [page, setPageState] = useState(initialPage);

  // Update URL search parameters
  const updateUrl = useCallback(
    (updates: {
      search?: string;
      fromDate?: string;
      toDate?: string;
      status?: 'ALL' | 'PENDING' | 'COMPLETED';
      page?: number;
    }) => {
      const sp = new URLSearchParams(
        searchParams ? searchParams.toString() : (typeof window !== 'undefined' ? window.location.search : '')
      );

      if (updates.search !== undefined) {
        const clean = updates.search.trim();
        if (clean) {
          sp.set('search', clean);
          sp.delete('q');
        } else {
          sp.delete('search');
          sp.delete('q');
        }
      }

      if (updates.fromDate !== undefined) {
        if (updates.fromDate) {
          sp.set('fromDate', updates.fromDate);
          sp.delete('startDate');
        } else {
          sp.delete('fromDate');
          sp.delete('startDate');
        }
      }

      if (updates.toDate !== undefined) {
        if (updates.toDate) {
          sp.set('toDate', updates.toDate);
          sp.delete('endDate');
        } else {
          sp.delete('toDate');
          sp.delete('endDate');
        }
      }

      if (updates.status !== undefined) {
        if (updates.status && updates.status !== 'ALL') {
          sp.set('status', updates.status);
        } else {
          sp.delete('status');
        }
      }

      if (updates.page !== undefined) {
        if (updates.page > 1) {
          sp.set('page', String(updates.page));
        } else {
          sp.delete('page');
        }
      }

      const qs = sp.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(target, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Search actions
  const handleSearchSubmit = useCallback(() => {
    const trimmed = search.trim();
    setPageState(1);
    setAppliedSearch(trimmed);
    updateUrl({ search: trimmed, page: 1 });
  }, [search, updateUrl]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
      }
    },
    [handleSearchSubmit]
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setAppliedSearch('');
    setPageState(1);
    updateUrl({ search: '', page: 1 });
  }, [updateUrl]);

  // Date range actions
  const handleApplyDateRange = useCallback(() => {
    setPageState(1);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    updateUrl({ fromDate, toDate, page: 1 });
  }, [fromDate, toDate, updateUrl]);

  const handleResetDateRange = useCallback(() => {
    const defFrom = computeSevenDaysAgoDate();
    const defTo = computeTodayDate();
    setFromDate(defFrom);
    setToDate(defTo);
    setAppliedFromDate(defFrom);
    setAppliedToDate(defTo);
    setPageState(1);
    updateUrl({ fromDate: defFrom, toDate: defTo, page: 1 });
  }, [updateUrl]);

  // Status Tab change
  const setBoardStatus = useCallback(
    (status: 'ALL' | 'PENDING' | 'COMPLETED') => {
      setBoardStatusState(status);
      setPageState(1);
      updateUrl({ status, page: 1 });
    },
    [updateUrl]
  );

  // Page change
  const setPage = useCallback(
    (newPage: number) => {
      setPageState(newPage);
      updateUrl({ page: newPage });
    },
    [updateUrl]
  );

  // Sync state if URL changes externally (e.g. Browser Back / Forward buttons)
  useEffect(() => {
    if (!searchParams) return;
    const urlSearch = (getParam('search', 'q') || '').trim();
    const urlFrom = getParam('fromDate', 'startDate');
    const urlTo = getParam('toDate', 'endDate');
    const urlPage = Number(getParam('page')) || 1;
    const urlStatus = getParam('status');

    if (urlSearch !== appliedSearch) {
      setSearch(urlSearch);
      setAppliedSearch(urlSearch);
    }
    if (urlFrom && /^\d{4}-\d{2}-\d{2}$/.test(urlFrom) && urlFrom !== appliedFromDate) {
      setFromDate(urlFrom);
      setAppliedFromDate(urlFrom);
    }
    if (urlTo && /^\d{4}-\d{2}-\d{2}$/.test(urlTo) && urlTo !== appliedToDate) {
      setToDate(urlTo);
      setAppliedToDate(urlTo);
    }
    if (urlPage !== page) {
      setPageState(urlPage);
    }
    if (urlStatus && ['ALL', 'PENDING', 'COMPLETED'].includes(urlStatus) && urlStatus !== boardStatus) {
      setBoardStatusState(urlStatus as any);
    } else if (!urlStatus && boardStatus !== 'ALL') {
      setBoardStatusState('ALL');
    }
  }, [searchParams, getParam, appliedSearch, appliedFromDate, appliedToDate, page, boardStatus]);

  // Initial mount: ensure fromDate & toDate are explicitly populated in the URL
  const hasInitializedUrlRef = useRef(false);
  useEffect(() => {
    if (hasInitializedUrlRef.current) return;
    hasInitializedUrlRef.current = true;

    const currentSp = new URLSearchParams(window.location.search);
    let shouldUpdate = false;
    if (!currentSp.has('fromDate') && !currentSp.has('startDate')) {
      currentSp.set('fromDate', appliedFromDate);
      shouldUpdate = true;
    }
    if (!currentSp.has('toDate') && !currentSp.has('endDate')) {
      currentSp.set('toDate', appliedToDate);
      shouldUpdate = true;
    }
    if (appliedSearch && !currentSp.has('search') && !currentSp.has('q')) {
      currentSp.set('search', appliedSearch);
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      router.replace(`${pathname}?${currentSp.toString()}`, { scroll: false });
    }
  }, [pathname, router, appliedFromDate, appliedToDate, appliedSearch]);

  return {
    search,
    setSearch,
    appliedSearch,
    handleSearchSubmit,
    handleSearchKeyDown,
    handleClearSearch,
    fromDate,
    toDate,
    appliedFromDate,
    appliedToDate,
    setFromDate,
    setToDate,
    handleApplyDateRange,
    handleResetDateRange,
    boardStatus,
    setBoardStatus,
    page,
    setPage
  };
}
