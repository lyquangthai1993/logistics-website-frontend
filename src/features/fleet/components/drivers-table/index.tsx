'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';
import { driversQueryOptions } from '../../api/queries';
import { columns } from './columns';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function DriversTable() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    fullName: parseAsString,
    status: parseAsString,
    licenseClass: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    search: params.search || params.fullName || undefined,
    status: params.status || undefined,
    licenseClass: params.licenseClass || undefined,
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data, isLoading } = useQuery(driversQueryOptions(filters));

  const pageCount = data ? Math.ceil(data.total_drivers / params.perPage) : -1;

  const { table } = useDataTable({
    data: data?.drivers ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 300,
    initialState: {
      columnPinning: { right: ['actions'] }
    },
    getRowId: (row) => `driver-row-${row.id}`
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table}>
        <div className='relative'>
          <IconSearch className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
          <Input
            id='fleet-search-input'
            type='search'
            placeholder='Tìm họ tên, SĐT, số GPLX...'
            value={params.search}
            onChange={(e) => {
              const val = e.target.value;
              void setParams({ search: val || null, page: 1 });
            }}
            className='h-8 w-44 lg:w-64 pl-8 text-xs bg-background'
          />
        </div>
      </DataTableToolbar>
    </DataTable>
  );
}
