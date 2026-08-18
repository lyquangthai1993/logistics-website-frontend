import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const tripsSearchParams = {
  tab: parseAsString.withDefault('pending-orders'),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString,
  name: parseAsString,
  status: parseAsString,
  vehicleId: parseAsString,
  driverId: parseAsString,
  preset: parseAsString.withDefault('thisMonth'),
  fromDate: parseAsString,
  toDate: parseAsString,
  sort: parseAsString
};

export const tripsSearchParamsCache = createSearchParamsCache(tripsSearchParams);
export const tripsSerialize = createSerializer(tripsSearchParams);
