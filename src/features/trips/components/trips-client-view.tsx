'use client';

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueryState, useQueryStates, parseAsString, parseAsInteger } from 'nuqs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';
import { TripsDatePresetBar } from './trips-date-preset-bar';
import { TripsKpiCards } from './trips-kpi-cards';
import { PendingOrdersView } from './pending-orders-view';
import { TripsTable } from './trips-tables';
import { tripKeys, tripStatsQueryOptions, tripsQueryOptions } from '../api/queries';
import { orderKeys, ordersQueryOptions } from '@/features/orders/api/queries';
import {
  rawVehiclesQueryOptions,
  rawDriversQueryOptions,
  fleetKeys
} from '@/features/fleet/api/queries';
import {
  getThisMonthRange,
  getLastMonthRange,
  getLast7DaysRange,
  getTodayRange,
  DatePreset
} from '../date-range';

export function TripsClientView() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('pending-orders'));

  // Normalize tab value for backward compatibility (supports 'pending' / 'all' as well)
  const normalizedTab = useMemo(() => {
    if (tab === 'pending' || tab === 'pending-orders') return 'pending-orders';
    if (tab === 'all' || tab === 'all-trips') return 'all-trips';
    return 'pending-orders';
  }, [tab]);

  const [dateParams, setDateParams] = useQueryStates({
    preset: parseAsString.withDefault('thisMonth'),
    fromDate: parseAsString,
    toDate: parseAsString,
    search: parseAsString,
    name: parseAsString,
    page: parseAsInteger.withDefault(1)
  });

  const preset = (dateParams.preset as DatePreset) || 'thisMonth';
  const searchTerm = dateParams.name || dateParams.search || '';

  const dateRange = useMemo(() => {
    if (preset === 'today') return getTodayRange();
    if (preset === '7days') return getLast7DaysRange();
    if (preset === 'lastMonth') return getLastMonthRange();
    if (preset === 'custom' && dateParams.fromDate && dateParams.toDate) {
      return { from: dateParams.fromDate, to: dateParams.toDate };
    }
    return getThisMonthRange();
  }, [preset, dateParams.fromDate, dateParams.toDate]);

  const { data: statsData, isLoading: isStatsLoading } = useQuery(
    tripStatsQueryOptions(dateRange.from, dateRange.to)
  );

  const { data: rawVehicles = [] } = useQuery(rawVehiclesQueryOptions());
  const { data: rawDrivers = [] } = useQuery(rawDriversQueryOptions());

  // Pending count query for tab badge
  const { data: pendingOrdersData } = useQuery(
    ordersQueryOptions({
      status: 'PENDING_ASSIGNMENT',
      search: searchTerm.trim() || undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
      page: 1,
      limit: 10
    })
  );

  // Trips total query for tab badge
  const { data: tripsData } = useQuery(
    tripsQueryOptions({
      search: searchTerm.trim() || undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
      page: 1,
      limit: 10
    })
  );

  const pendingTotal = pendingOrdersData?.meta?.total ?? statsData?.ordersAwaitingFleet ?? 0;
  const tripsTotal = tripsData?.meta?.total ?? statsData?.tripsTotal ?? 0;
  const externalVehiclesCount = rawVehicles.filter((v) => v.isExternal).length;

  const handlePresetChange = useCallback(
    (newPreset: DatePreset) => {
      let newRange = getThisMonthRange();
      if (newPreset === 'today') newRange = getTodayRange();
      else if (newPreset === '7days') newRange = getLast7DaysRange();
      else if (newPreset === 'lastMonth') newRange = getLastMonthRange();

      setDateParams({
        preset: newPreset,
        fromDate: newRange.from,
        toDate: newRange.to,
        page: 1
      });
    },
    [setDateParams]
  );

  const handleCustomDateChange = useCallback(
    (field: 'from' | 'to', value: string) => {
      setDateParams({
        preset: 'custom',
        ...(field === 'from' ? { fromDate: value } : { toDate: value }),
        page: 1
      });
    },
    [setDateParams]
  );

  const handleSearchChange = (value: string) => {
    setDateParams({
      search: value || null,
      name: value || null,
      page: 1
    });
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tripKeys.all }),
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      queryClient.invalidateQueries({ queryKey: fleetKeys.all })
    ]);
  };

  return (
    <div className='flex flex-1 flex-col space-y-6'>
      {/* Date Range Filter Bar */}
      <TripsDatePresetBar
        preset={preset}
        dateRange={dateRange}
        onPresetChange={handlePresetChange}
        onCustomDateChange={handleCustomDateChange}
        onRefresh={handleRefresh}
        loading={isStatsLoading}
        fromDateVi={statsData?.fromDate}
        toDateVi={statsData?.toDate}
      />

      {/* KPI Summary Cards */}
      <TripsKpiCards
        stats={statsData}
        externalVehiclesCount={externalVehiclesCount}
        loading={isStatsLoading}
      />

      {/* Main Dual-Tab Dispatch Layout */}
      <Tabs
        value={normalizedTab}
        onValueChange={(val) => setTab(val as 'pending-orders' | 'all-trips')}
        className='space-y-4'
      >
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <TabsList className='bg-slate-100 dark:bg-slate-800 p-1'>
            <TabsTrigger
              value='pending-orders'
              id='tab-pending-orders'
              className='relative cursor-pointer px-4'
            >
              Đơn Cần Phân Xe
              {pendingTotal > 0 && (
                <span className='ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white'>
                  {pendingTotal}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='all-trips' id='tab-all-trips' className='cursor-pointer px-4'>
              Danh Sách Chuyến Xe ({tripsTotal})
            </TabsTrigger>
          </TabsList>

          <div className='relative max-w-xs w-full'>
            <IconSearch className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            <Input
              placeholder='Tìm kiếm mã đơn / biển số...'
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-9 bg-slate-50/50 dark:bg-slate-900 text-sm'
            />
          </div>
        </div>

        {/* Tab 1: Pending Orders */}
        <TabsContent value='pending-orders' className='space-y-4 m-0'>
          <PendingOrdersView
            search={searchTerm}
            fromDate={dateRange.from}
            toDate={dateRange.to}
            vehicles={rawVehicles}
            drivers={rawDrivers}
          />
        </TabsContent>

        {/* Tab 2: All Trips */}
        <TabsContent value='all-trips' className='space-y-4 m-0'>
          <TripsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
