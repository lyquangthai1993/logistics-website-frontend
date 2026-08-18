import { queryOptions, useQuery } from '@tanstack/react-query';
import { getTrips, getTripStats, getTrip } from './service';
import type { QueryTripParams } from './types';

export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (filters: QueryTripParams = {}) => [...tripKeys.lists(), filters] as const,
  stats: () => [...tripKeys.all, 'stats'] as const,
  stat: (fromDate?: string, toDate?: string) =>
    [...tripKeys.stats(), { fromDate, toDate }] as const,
  details: () => [...tripKeys.all, 'detail'] as const,
  detail: (id: number) => [...tripKeys.details(), id] as const
};

export const tripsQueryOptions = (filters: QueryTripParams = {}) =>
  queryOptions({
    queryKey: tripKeys.list(filters),
    queryFn: () => getTrips(filters)
  });

export const tripStatsQueryOptions = (fromDate?: string, toDate?: string) =>
  queryOptions({
    queryKey: tripKeys.stat(fromDate, toDate),
    queryFn: () => getTripStats(fromDate, toDate)
  });

export const tripByIdQueryOptions = (id: number) =>
  queryOptions({
    queryKey: tripKeys.detail(id),
    queryFn: () => getTrip(id)
  });

export function useTripsQuery(filters: QueryTripParams = {}) {
  return useQuery(tripsQueryOptions(filters));
}

export function useTripStatsQuery(fromDate?: string, toDate?: string) {
  return useQuery(tripStatsQueryOptions(fromDate, toDate));
}

export function useTripQuery(id: number) {
  return useQuery(tripByIdQueryOptions(id));
}
