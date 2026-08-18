import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { warehouseSearchParamsCache } from '../params';
import { tripsQueryOptions } from '@/features/trips/api/queries';
import { activeHubsQueryOptions } from '@/features/hubs/api/queries';
import { WarehouseTable } from './warehouse-tables';
import type { QueryTripParams } from '@/features/trips/api/types';

export default async function WarehouseListing() {
  const page = warehouseSearchParamsCache.get('page') || 1;
  const perPage = warehouseSearchParamsCache.get('perPage') || 10;
  const search =
    warehouseSearchParamsCache.get('name') || warehouseSearchParamsCache.get('search');
  const hub =
    warehouseSearchParamsCache.get('hub') ||
    warehouseSearchParamsCache.get('destinationHub') ||
    warehouseSearchParamsCache.get('hubId');
  const status = warehouseSearchParamsCache.get('status');
  const sort = warehouseSearchParamsCache.get('sort');

  const filters: QueryTripParams = {
    page,
    limit: perPage,
    ...(search && { search }),
    ...(hub && hub !== 'ALL' && { hub }),
    ...(status && status !== 'ALL' && { status: status as any }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();

  // Prefetch trips list, total dataset for metrics, and active hubs in parallel
  void queryClient.prefetchQuery(tripsQueryOptions(filters));
  void queryClient.prefetchQuery(tripsQueryOptions({ limit: 100 }));
  void queryClient.prefetchQuery(activeHubsQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WarehouseTable />
    </HydrationBoundary>
  );
}
