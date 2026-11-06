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
  const rawLevel = searchParamsCache.get('level');
  const sort = searchParamsCache.get('sort');

  let isActive: boolean | undefined = undefined;
  const statusTokens = (status || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasActive = statusTokens.includes('active') || statusTokens.includes('true');
  const hasInactive = statusTokens.includes('inactive') || statusTokens.includes('false');
  const hasDeleted = statusTokens.includes('deleted');

  if (!hasDeleted) {
    if (hasActive && !hasInactive) {
      isActive = true;
    } else if (hasInactive && !hasActive) {
      isActive = false;
    }
  }
  const normalizedStatus = statusTokens.length > 0 ? statusTokens.join(',') : undefined;

  const levelTokens = (rawLevel || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => n === 1 || n === 2);
  const level: number | undefined = levelTokens.length === 1 ? levelTokens[0] : undefined;

  const filters: HubFilters = {
    page,
    limit: perPage,
    ...(search && { search }),
    ...(isActive !== undefined && { isActive }),
    ...(normalizedStatus && { status: normalizedStatus }),
    ...(level !== undefined && { level }),
    ...(sort && { sort })
  };

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(hubsQueryOptions(filters));
  void queryClient.prefetchQuery(hubsQueryOptions({ limit: 100 }));
  void queryClient.prefetchQuery(hubsQueryOptions({ limit: 1, status: 'deleted' }));
  void queryClient.prefetchQuery(hubsQueryOptions({ limit: 1, status: 'deleted' }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='flex flex-1 flex-col space-y-4'>
        <HubsMetrics />
        <HubsTable />
      </div>
    </HydrationBoundary>
  );
}
