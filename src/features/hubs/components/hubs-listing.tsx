import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { hubsQueryOptions } from '../api/queries';
import { HubsTable } from './hubs-tables';
import { HubsMetrics } from './hubs-metrics';
import type { HubFilters } from '../api/types';

export default async function HubsListing() {
  const page = searchParamsCache.get('page') || 1;
  const perPage = searchParamsCache.get('perPage') || 10;
  const search = searchParamsCache.get('name') || searchParamsCache.get('search');
  const status = searchParamsCache.get('status') || searchParamsCache.get('isActive');
  const sort = searchParamsCache.get('sort');

  let isActive: boolean | undefined = undefined;
  if (status === 'active' || status === 'true' || status === 'ACTIVE') {
    isActive = true;
  } else if (status === 'inactive' || status === 'false' || status === 'INACTIVE') {
    isActive = false;
  }

  const filters: HubFilters = {
    page,
    limit: perPage,
    ...(search && { search }),
    ...(isActive !== undefined && { isActive }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(hubsQueryOptions(filters));
  void queryClient.prefetchQuery(hubsQueryOptions({ limit: 100 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='flex flex-1 flex-col space-y-4'>
        <HubsMetrics />
        <HubsTable />
      </div>
    </HydrationBoundary>
  );
}
