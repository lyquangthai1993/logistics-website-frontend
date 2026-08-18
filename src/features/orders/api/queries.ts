import { queryOptions, useQuery } from '@tanstack/react-query';
import { getOrders, getOrderStats, getOrderById, generateOrderCode } from './service';
import type { OrderFilters } from './types';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  stat: (fromDate?: string, toDate?: string) =>
    [...orderKeys.stats(), { fromDate, toDate }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
  generateCode: (prefix?: string) => [...orderKeys.all, 'generateCode', prefix] as const
};

export const ordersQueryOptions = (filters: OrderFilters = {}) =>
  queryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: () => getOrders(filters)
  });

export const ordersStatsQueryOptions = (fromDate?: string, toDate?: string) =>
  queryOptions({
    queryKey: orderKeys.stat(fromDate, toDate),
    queryFn: () => getOrderStats(fromDate, toDate)
  });

export const orderByIdQueryOptions = (id: number) =>
  queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrderById(id)
  });

export const generateOrderCodeQueryOptions = (prefix?: string) =>
  queryOptions({
    queryKey: orderKeys.generateCode(prefix),
    queryFn: () => generateOrderCode(prefix)
  });

export function useOrdersQuery(filters: OrderFilters = {}) {
  return useQuery(ordersQueryOptions(filters));
}

export function useOrdersStatsQuery(fromDate?: string, toDate?: string) {
  return useQuery(ordersStatsQueryOptions(fromDate, toDate));
}

export function useOrderQuery(id: number) {
  return useQuery(orderByIdQueryOptions(id));
}
