import { queryOptions } from '@tanstack/react-query';
import { getHubs, getActiveHubs, getHubById } from './service';
import type { Hub, HubFilters } from './types';

export type { Hub };

export const hubKeys = {
  all: ['hubs'] as const,
  lists: () => [...hubKeys.all, 'list'] as const,
  list: (filters: HubFilters) => [...hubKeys.lists(), filters] as const,
  active: () => [...hubKeys.all, 'active'] as const,
  details: () => [...hubKeys.all, 'detail'] as const,
  detail: (id: number) => [...hubKeys.details(), id] as const
};

export const hubsQueryOptions = (filters: HubFilters = {}) =>
  queryOptions({
    queryKey: hubKeys.list(filters),
    queryFn: () => getHubs(filters)
  });

export const activeHubsQueryOptions = () =>
  queryOptions({
    queryKey: hubKeys.active(),
    queryFn: () => getActiveHubs()
  });

export const hubByIdQueryOptions = (id: number) =>
  queryOptions({
    queryKey: hubKeys.detail(id),
    queryFn: () => getHubById(id)
  });
