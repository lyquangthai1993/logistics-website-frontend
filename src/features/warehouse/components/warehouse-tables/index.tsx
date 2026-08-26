'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
import { tripsQueryOptions } from '@/features/trips/api/queries';
import { activeHubsQueryOptions } from '@/features/hubs/api/queries';
import { columns } from './columns';
import { useWarehouseTableFilters } from './use-warehouse-table-filters';
import { WarehouseKpiCards } from '../warehouse-kpi-cards';
import { WarehouseInboundBoard } from '../warehouse-inbound-board';
import { DEFAULT_HUBS } from './options';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function WarehouseTable() {
  const { filters, params, selectedHub, currentView, setView, setSelectedHub } =
    useWarehouseTableFilters(columnIds);

  const {
    data: tripsResponse,
    isLoading: isTripsLoading,
    refetch
  } = useQuery(tripsQueryOptions(filters));
  const { data: allInboundTripsResponse } = useQuery(tripsQueryOptions({ limit: 100 }));
  const { data: activeHubs = [] } = useQuery(activeHubsQueryOptions());

  const hubOptions = activeHubs.length > 0 ? activeHubs.map((h) => h.name) : DEFAULT_HUBS;

  const trips = tripsResponse?.data ?? [];
  const total = tripsResponse?.meta?.total ?? 0;
  const perPage = params.perPage || 10;
  const pageCount = Math.ceil(total / perPage);

  const { table } = useDataTable({
    data: trips,
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
      {/* KPI Cards */}
      <WarehouseKpiCards trips={allInboundTripsResponse?.data ?? trips} loading={isTripsLoading} />

      {/* View Switcher & Hub Selector Bar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/70 shadow-2xs'>
        <div className='flex items-center gap-3'>
          <label
            htmlFor='warehouse-hub-filter'
            className='text-xs font-semibold text-muted-foreground whitespace-nowrap'
          >
            Lọc theo Hub đích:
          </label>
          <select
            id='warehouse-hub-filter'
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className='px-3 py-1.5 text-xs sm:text-sm bg-background border border-border rounded-md focus:outline-none cursor-pointer'
          >
            <option value='ALL'>Tất cả các Hub tiếp nhận</option>
            {hubOptions.map((hub) => (
              <option key={hub} value={hub}>
                {hub}
              </option>
            ))}
          </select>
        </div>

        <div className='flex items-center gap-2 self-end sm:self-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='h-8 text-xs cursor-pointer'
          >
            <Icons.refresh className='mr-1.5 h-3.5 w-3.5' />
            Làm mới
          </Button>

          <div className='flex items-center rounded-md border border-border bg-muted p-0.5'>
            <Button
              variant={currentView === 'table' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setView('table')}
              className='h-7 px-2.5 text-xs cursor-pointer'
              title='Chế độ bảng'
            >
              <Icons.table className='h-3.5 w-3.5 mr-1' />
              Bảng
            </Button>
            <Button
              variant={currentView === 'cards' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setView('cards')}
              className='h-7 px-2.5 text-xs cursor-pointer'
              title='Chế độ thẻ'
            >
              <Icons.layoutGrid className='h-3.5 w-3.5 mr-1' />
              Thẻ
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Card Board */}
      {currentView === 'table' ? (
        <DataTable table={table}>
          <DataTableToolbar table={table} />
        </DataTable>
      ) : (
        <div className='space-y-4'>
          <WarehouseInboundBoard trips={trips} loading={isTripsLoading} />
          <DataTablePagination table={table} />
        </div>
      )}
    </div>
  );
}

export function WarehouseTableSkeleton() {
  return (
    <div className='flex flex-1 animate-pulse flex-col gap-4'>
      <div className='grid gap-4 md:grid-cols-4'>
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
        <div className='bg-muted h-28 rounded-lg' />
      </div>
      <div className='bg-muted h-12 w-full rounded-lg' />
      <div className='bg-muted h-96 w-full rounded-lg' />
      <div className='bg-muted h-10 w-full rounded' />
    </div>
  );
}
