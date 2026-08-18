'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { hubsQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { useHubsTableFilters } from './use-hubs-table-filters';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function HubsTable() {
  const { filters, params } = useHubsTableFilters(columnIds);

  const { data } = useSuspenseQuery(hubsQueryOptions(filters));
  const perPage = params.perPage || 10;
  const total = data.meta?.total ?? 0;
  const pageCount = Math.ceil(total / perPage);

  const { table } = useDataTable({
    data: data.data ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 300,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}

export function HubsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
