import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { ordersSearchParamsCache } from '../params';
import { ordersQueryOptions, ordersStatsQueryOptions } from '../api/queries';
import { activeHubsQueryOptions } from '@/features/hubs/api/queries';
import { OrdersTable } from './orders-tables';
import {
  getThisMonthRange,
  getLastMonthRange,
  getLast7DaysRange,
  getTodayRange
} from '../date-range';
import type { OrderFilters } from '../api/types';

export default async function OrdersListing() {
  const page = ordersSearchParamsCache.get('page') || 1;
  const perPage = ordersSearchParamsCache.get('perPage') || 10;
  const search = ordersSearchParamsCache.get('name') || ordersSearchParamsCache.get('search');
  const status = ordersSearchParamsCache.get('status');
  const hub = ordersSearchParamsCache.get('hub');
  const originHub =
    ordersSearchParamsCache.get('originHub') || (hub && hub !== 'ALL' ? hub : undefined);
  const destinationHub = ordersSearchParamsCache.get('destinationHub');
  const preset = ordersSearchParamsCache.get('preset') || 'thisMonth';
  const customFrom = ordersSearchParamsCache.get('fromDate');
  const customTo = ordersSearchParamsCache.get('toDate');
  const sort = ordersSearchParamsCache.get('sort');

  let dateRange = getThisMonthRange();
  if (preset === 'today') dateRange = getTodayRange();
  else if (preset === '7days') dateRange = getLast7DaysRange();
  else if (preset === 'lastMonth') dateRange = getLastMonthRange();
  else if (preset === 'custom' && customFrom && customTo) {
    dateRange = { from: customFrom, to: customTo };
  }

  const filters: OrderFilters = {
    page,
    limit: perPage,
    ...(search && { search }),
    ...(status && status !== 'ALL' && { status }),
    ...(originHub && { originHub }),
    ...(destinationHub && { destinationHub }),
    ...(dateRange.from && { fromDate: dateRange.from }),
    ...(dateRange.to && { toDate: dateRange.to }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  // Prefetch orders list, KPI stats, and active hubs in parallel
  void queryClient.prefetchQuery(ordersQueryOptions(filters));
  void queryClient.prefetchQuery(ordersStatsQueryOptions(dateRange.from, dateRange.to));
  void queryClient.prefetchQuery(activeHubsQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrdersTable />
    </HydrationBoundary>
  );
}
