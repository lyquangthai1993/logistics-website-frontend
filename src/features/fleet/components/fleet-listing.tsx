'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState, parseAsString } from 'nuqs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { IconTruck, IconUserCheck, IconPlus } from '@tabler/icons-react';
import { VehiclesTable } from './vehicles-table';
import { DriversTable } from './drivers-table';
import { FleetKpiCards } from './fleet-kpi-cards';
import { VehicleFormDialog } from './vehicle-form-dialog';
import { DriverFormDialog } from './driver-form-dialog';
import { rawVehiclesQueryOptions, rawDriversQueryOptions } from '../api/queries';

export default function FleetListingPage() {
  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('vehicles'));
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const { data: rawVehicles = [] } = useQuery(rawVehiclesQueryOptions());
  const { data: rawDrivers = [] } = useQuery(rawDriversQueryOptions());

  return (
    <div className='flex-1 space-y-6'>
      {/* Header Actions */}
      <div className='flex items-center justify-end gap-3'>
        <Button
          id='btn-add-vehicle'
          onClick={() => setIsVehicleModalOpen(true)}
          className='cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all'
        >
          <IconPlus className='mr-2 h-4 w-4' />
          Thêm Xe Mới
        </Button>
        <Button
          id='btn-add-driver'
          onClick={() => setIsDriverModalOpen(true)}
          variant='outline'
          className='cursor-pointer border-primary/30 hover:bg-accent text-foreground shadow-xs transition-all'
        >
          <IconUserCheck className='mr-2 h-4 w-4 text-primary' />
          Thêm Tài Xế Mới
        </Button>
      </div>

      {/* KPI Cards */}
      <FleetKpiCards vehicles={rawVehicles} drivers={rawDrivers} />

      {/* Main Dual-Tab Workspace */}
      <Tabs
        value={tab}
        onValueChange={(val) => setTab(val as 'vehicles' | 'drivers')}
        className='space-y-4'
      >
        <TabsList className='bg-muted p-1'>
          <TabsTrigger
            value='vehicles'
            id='tab-vehicles'
            className='cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-xs px-4'
          >
            <IconTruck className='h-4 w-4 mr-2' />
            Danh Sách Xe ({rawVehicles.length})
          </TabsTrigger>
          <TabsTrigger
            value='drivers'
            id='tab-drivers'
            className='cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-xs px-4'
          >
            <IconUserCheck className='h-4 w-4 mr-2' />
            Danh Sách Tài Xế ({rawDrivers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='vehicles' className='m-0 space-y-4'>
          <VehiclesTable />
        </TabsContent>

        <TabsContent value='drivers' className='m-0 space-y-4'>
          <DriversTable />
        </TabsContent>
      </Tabs>

      {/* Add Modals */}
      <VehicleFormDialog
        open={isVehicleModalOpen}
        onOpenChange={setIsVehicleModalOpen}
        vehicle={null}
      />
      <DriverFormDialog
        open={isDriverModalOpen}
        onOpenChange={setIsDriverModalOpen}
        driver={null}
      />
    </div>
  );
}
