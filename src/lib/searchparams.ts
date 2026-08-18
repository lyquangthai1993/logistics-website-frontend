import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const searchParams = {
  tab: parseAsString.withDefault('vehicles'),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString,
  name: parseAsString,
  gender: parseAsString,
  category: parseAsString,
  role: parseAsString,
  status: parseAsString,
  isActive: parseAsString,
  type: parseAsString,
  licensePlate: parseAsString,
  fullName: parseAsString,
  licenseClass: parseAsString,
  model: parseAsString,
  sort: parseAsString,
  hub: parseAsString,
  originHub: parseAsString,
  destinationHub: parseAsString,
  fromDate: parseAsString,
  toDate: parseAsString,
  preset: parseAsString
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
