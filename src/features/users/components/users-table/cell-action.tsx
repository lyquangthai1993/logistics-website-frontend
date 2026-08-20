'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteUserMutation } from '../../api/mutations';
import type { User } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { UserFormSheet } from '../user-form-sheet';

interface CellActionProps {
  data: User;
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useMutation({
    ...deleteUserMutation,
    onSuccess: () => {
      showApiSuccessToast('Đã xóa người dùng thành công');
      setDeleteOpen(false);
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể xóa người dùng. Vui lòng thử lại.');
    }
  });

  const displayName =
    `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || 'người dùng này';

  return (
    <>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent id='delete-user-dialog' className='sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle className='text-destructive font-bold'>
              Xác Nhận Xóa Người Dùng
            </DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            Bạn có chắc chắn muốn xóa người dùng{' '}
            <strong className='text-foreground font-semibold'>{displayName}</strong>? Thao tác này
            sẽ vô hiệu hóa tài khoản và không thể hoàn tác.
          </p>
          <DialogFooter className='pt-2 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
              className='cursor-pointer'
            >
              Hủy
            </Button>
            <Button
              type='button'
              id='btn-confirm-delete'
              variant='destructive'
              onClick={() => deleteMutation.mutate(data.id)}
              disabled={deleteMutation.isPending}
              className='cursor-pointer'
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormSheet user={data} open={editOpen} onOpenChange={setEditOpen} />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              className='h-8 w-8 p-0 cursor-pointer'
              data-testid={`user-row-actions-${data.id}`}
            />
          }
        >
          <span className='sr-only'>Mở menu thao tác</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setEditOpen(true)}
              className='cursor-pointer'
              data-testid={`btn-edit-user-${data.id}`}
            >
              <Icons.edit className='mr-2 h-4 w-4' /> Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className='cursor-pointer text-destructive focus:text-destructive'
              data-testid={`btn-delete-user-${data.id}`}
            >
              <Icons.trash className='mr-2 h-4 w-4' /> Xóa người dùng
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
