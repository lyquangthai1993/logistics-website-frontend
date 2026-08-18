'use client';

import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { useCallback, useMemo } from 'react';
import type { OrderFilters } from '../../api/types';
import type { DatePreset } from './options';
import {
  getThisMonthRange,
  getLastMonthRange,
  getLast7DaysRange,
  getTodayRange
} from '../../date-range';

export {
  toLocalDateString,
  getThisMonthRange,
  getLastMonthRange,
  getLast7DaysRange,
  getTodayRange
} from '../../date-range';

export function useOrdersTableFilters(columnIds: string[] = []) {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString,
    name: parseAsString,
    status: parseAsString,
    hub: parseAsString,
    originHub: parseAsString,
    destinationHub: parseAsString,
    preset: parseAsString.withDefault('thisMonth'),
    fromDate: parseAsString,
    toDate: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const search = params.name || params.search || '';
  const status = params.status;
  const hub = params.hub;
  const originHub = params.originHub || (hub && hub !== 'ALL' ? hub : undefined);
  const destinationHub = params.destinationHub;
  const preset = (params.preset as DatePreset) || 'thisMonth';

  const dateRange = useMemo(() => {
    if (preset === 'today') return getTodayRange();
    if (preset === '7days') return getLast7DaysRange();
    if (preset === 'lastMonth') return getLastMonthRange();
    if (preset === 'custom' && params.fromDate && params.toDate) {
      return { from: params.fromDate, to: params.toDate };
    }
    return getThisMonthRange();
  }, [preset, params.fromDate, params.toDate]);

  const filters: OrderFilters = useMemo(
    () => ({
      page: params.page,
      limit: params.perPage,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(originHub && originHub !== 'ALL' ? { originHub } : {}),
      ...(destinationHub && destinationHub !== 'ALL' ? { destinationHub } : {}),
      ...(dateRange.from ? { fromDate: dateRange.from } : {}),
      ...(dateRange.to ? { toDate: dateRange.to } : {}),
      ...(params.sort && params.sort.length > 0 ? { sort: JSON.stringify(params.sort) } : {})
    }),
    [
      params.page,
      params.perPage,
      search,
      status,
      originHub,
      destinationHub,
      dateRange.from,
      dateRange.to,
      params.sort
    ]
  );

  const setPreset = useCallback(
    (newPreset: DatePreset) => {
      let newRange = getThisMonthRange();
      if (newPreset === 'today') newRange = getTodayRange();
      else if (newPreset === '7days') newRange = getLast7DaysRange();
      else if (newPreset === 'lastMonth') newRange = getLastMonthRange();

      setParams({
        preset: newPreset,
        fromDate: newRange.from,
        toDate: newRange.to,
        page: 1
      });
    },
    [setParams]
  );

  const setCustomDate = useCallback(
    (field: 'from' | 'to', value: string) => {
      setParams({
        preset: 'custom',
        ...(field === 'from' ? { fromDate: value } : { toDate: value }),
        page: 1
      });
    },
    [setParams]
  );

  const resetFilters = useCallback(() => {
    const defaultRange = getThisMonthRange();
    setParams({
      name: null,
      search: null,
      status: null,
      hub: null,
      originHub: null,
      destinationHub: null,
      preset: 'thisMonth',
      fromDate: defaultRange.from,
      toDate: defaultRange.to,
      page: 1
    });
  }, [setParams]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(
      params.name ||
        params.search ||
        (params.status && params.status !== 'ALL') ||
        (params.hub && params.hub !== 'ALL') ||
        (params.originHub && params.originHub !== 'ALL') ||
        (params.destinationHub && params.destinationHub !== 'ALL') ||
        params.preset !== 'thisMonth'
    );
  }, [params]);

  return {
    params,
    setParams,
    search,
    status,
    originHub,
    destinationHub,
    preset,
    dateRange,
    filters,
    setPreset,
    setCustomDate,
    resetFilters,
    isAnyFilterActive
  };
}
