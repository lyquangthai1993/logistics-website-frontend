'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { deleteDriverMutation } from '../../api/mutations';
import { DriverFormDialog } from '../driver-form-dialog';
import { DeleteConfirmDialog } from '../delete-confirm-dialog';
import type { Driver } from '../../api/types';

interface CellActionProps {
  data: Driver;
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    ...deleteDriverMutation,
    onSuccess: () => {
      toast.success('Đã xóa tài xế thành công!');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
    onError: (err: any) => {
      const apiMessage = err?.response?.data?.message;
      toast.error(apiMessage || 'Không thể xóa tài xế. Vui lòng thử lại.');
    }
  });

  return (
    <>
      <DriverFormDialog
        driver={data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={data.fullName}
        itemType='tài xế'
        onConfirm={() => deleteMutation.mutate(data.id)}
        isLoading={deleteMutation.isPending}
      />

      <div className='flex items-center justify-end gap-1'>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Chỉnh sửa tài xế'
          data-testid={`btn-edit-driver-${data.id}`}
          onClick={() => setEditOpen(true)}
          className='h-8 px-2 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10'
        >
          <IconEdit className='h-3.5 w-3.5' />
        </Button>
        <Button
          size='sm'
          variant='ghost'
          aria-label='Xóa tài xế'
          data-testid={`btn-delete-driver-${data.id}`}
          onClick={() => setDeleteOpen(true)}
          className='h-8 px-2 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        >
          <IconTrash className='h-3.5 w-3.5' />
        </Button>
      </div>
    </>
  );
}
