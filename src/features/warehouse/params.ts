import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const warehouseSearchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString,
  name: parseAsString,
  hub: parseAsString,
  hubId: parseAsString,
  destinationHub: parseAsString,
  status: parseAsString.withDefault('ALL'),
  view: parseAsString.withDefault('table'), // 'table' | 'cards'
  sort: parseAsString
};

export const warehouseSearchParamsCache = createSearchParamsCache(warehouseSearchParams);
export const warehouseSerialize = createSerializer(warehouseSearchParams);
