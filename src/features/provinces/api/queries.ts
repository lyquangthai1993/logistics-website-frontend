import { queryOptions } from '@tanstack/react-query';
import { getProvinceReferences } from './service';

export const provinceReferenceKeys = {
  all: ['province-references'] as const
};

export const provinceReferencesQueryOptions = () =>
  queryOptions({
    queryKey: provinceReferenceKeys.all,
    queryFn: getProvinceReferences,
    staleTime: 30 * 60 * 1000
  });
