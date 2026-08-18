'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { tripsQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { useTripsTableFilters } from './use-trips-table-filters';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function TripsTable() {
  const { filters, params } = useTripsTableFilters(columnIds);

  const { data: tripsData } = useQuery(tripsQueryOptions(filters));

  const perPage = params.perPage || 10;
  const total = tripsData?.meta?.total ?? 0;
  const pageCount = Math.ceil(total / perPage);

  const { table } = useDataTable({
    data: tripsData?.data ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 300,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <div className='flex flex-1 flex-col space-y-4'>
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

export function TripsTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-12 w-full rounded' />
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
