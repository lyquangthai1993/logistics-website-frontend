import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { tripsSearchParamsCache } from '../params';
import { tripsQueryOptions, tripStatsQueryOptions } from '../api/queries';
import { ordersQueryOptions } from '@/features/orders/api/queries';
import { rawVehiclesQueryOptions, rawDriversQueryOptions } from '@/features/fleet/api/queries';
import { TripsClientView } from './trips-client-view';
import {
  getThisMonthRange,
  getLastMonthRange,
  getLast7DaysRange,
  getTodayRange
} from '../date-range';
import type { QueryTripParams } from '../api/types';

export default async function TripsListing() {
  const page = tripsSearchParamsCache.get('page') || 1;
  const perPage = tripsSearchParamsCache.get('perPage') || 10;
  const search = tripsSearchParamsCache.get('name') || tripsSearchParamsCache.get('search');
  const status = tripsSearchParamsCache.get('status');
  const preset = tripsSearchParamsCache.get('preset') || 'thisMonth';
  const customFrom = tripsSearchParamsCache.get('fromDate');
  const customTo = tripsSearchParamsCache.get('toDate');
  const sort = tripsSearchParamsCache.get('sort');

  let dateRange = getThisMonthRange();
  if (preset === 'today') dateRange = getTodayRange();
  else if (preset === '7days') dateRange = getLast7DaysRange();
  else if (preset === 'lastMonth') dateRange = getLastMonthRange();
  else if (preset === 'custom' && customFrom && customTo) {
    dateRange = { from: customFrom, to: customTo };
  }

  const filters: QueryTripParams = {
    page,
    limit: perPage,
    ...(search && { search }),
    ...(status && status !== 'ALL' && { status }),
    ...(dateRange.from && { fromDate: dateRange.from }),
    ...(dateRange.to && { toDate: dateRange.to }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  // Prefetch trips, stats, pending orders queue, vehicles, and drivers in parallel
  await Promise.all([
    queryClient.prefetchQuery(tripsQueryOptions(filters)),
    queryClient.prefetchQuery(tripStatsQueryOptions(dateRange.from, dateRange.to)),
    queryClient.prefetchQuery(
      ordersQueryOptions({
        status: 'PENDING_ASSIGNMENT',
        ...(search && { search }),
        ...(dateRange.from && { fromDate: dateRange.from }),
        ...(dateRange.to && { toDate: dateRange.to }),
        page: 1,
        limit: 10
      })
    ),
    queryClient.prefetchQuery(rawVehiclesQueryOptions()),
    queryClient.prefetchQuery(rawDriversQueryOptions())
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TripsClientView />
    </HydrationBoundary>
  );
}
