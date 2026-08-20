'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { deleteVehicleMutation } from '../../api/mutations';
import { VehicleFormDialog } from '../vehicle-form-dialog';
import { DeleteConfirmDialog } from '../delete-confirm-dialog';
import type { Vehicle } from '../../api/types';

interface CellActionProps {
  data: Vehicle;
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteVehicleMutation,
    onSuccess: () => {
      showApiSuccessToast('Đã xóa xe thành công!');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: unknown) => {
      showApiErrorToast(err, 'Không thể xóa xe. Vui lòng thử lại.');
    }
  });

  return (
    <>
      <VehicleFormDialog
        vehicle={data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={data.licensePlate}
        itemType='xe'
        onConfirm={() => deleteMutation.mutate(data.id)}
        isLoading={deleteMutation.isPending}
      />

      <div className='flex items-center justify-end gap-1'>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Chỉnh sửa xe'
          data-testid={`btn-edit-vehicle-${data.id}`}
          onClick={() => setEditOpen(true)}
          className='h-8 px-2 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10'
        >
          <IconEdit className='h-3.5 w-3.5' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Xóa xe'
          data-testid={`btn-delete-vehicle-${data.id}`}
          onClick={() => setDeleteOpen(true)}
          className='h-8 px-2 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        >
          <IconTrash className='h-3.5 w-3.5' />
        </Button>
      </div>
    </>
  );
}
