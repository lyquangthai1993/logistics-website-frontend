'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { ordersQueryOptions, ordersStatsQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { useOrdersTableFilters } from './use-orders-table-filters';
import { OrdersKpiCards } from '../orders-kpi-cards';
import { OrdersDatePresetBar } from '../orders-date-preset-bar';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function OrdersTable() {
  const {
    filters,
    params,
    dateRange,
    preset,
    setPreset,
    setCustomDate
  } = useOrdersTableFilters(columnIds);

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery(
    ordersQueryOptions(filters)
  );
  const { data: statsData, isLoading: isStatsLoading } = useQuery(
    ordersStatsQueryOptions(dateRange.from, dateRange.to)
  );

  const perPage = params.perPage || 10;
  const total = ordersData?.meta?.total ?? 0;
  const pageCount = Math.ceil(total / perPage);

  const { table } = useDataTable({
    data: ordersData?.data ?? [],
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
      <OrdersDatePresetBar
        preset={preset}
        dateRange={dateRange}
        onPresetChange={setPreset}
        onCustomDateChange={setCustomDate}
        fromDateVi={statsData?.fromDate}
        toDateVi={statsData?.toDate}
      />
      <OrdersKpiCards stats={statsData} loading={isStatsLoading} />
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

export function OrdersTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='bg-muted h-12 w-full rounded' />
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
      </div>
      <div className='bg-muted h-10 w-full rounded' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
