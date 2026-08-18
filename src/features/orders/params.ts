import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const ordersSearchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString,
  name: parseAsString,
  status: parseAsString,
  hub: parseAsString,
  originHub: parseAsString,
  destinationHub: parseAsString,
  fromDate: parseAsString,
  toDate: parseAsString,
  preset: parseAsString,
  sort: parseAsString
};

export const ordersSearchParamsCache = createSearchParamsCache(ordersSearchParams);
export const ordersSerialize = createSerializer(ordersSearchParams);
