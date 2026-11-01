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
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteUserMutation } from '../../api/mutations';
import { loginAsUser } from '../../api/service';
import type { User } from '../../api/types';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager, getDefaultPathForRole } from '@/lib/token-manager';
import { UserFormDialog } from '../user-form-dialog';

interface CellActionProps {
  data: User;
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isLoggingAs, setIsLoggingAs] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  const impersonator = useAuthStore((s) => s.impersonator);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || Boolean(impersonator);
  const isSelf = String(currentUser?.id) === String(data.id);

  const statusId = data.status?.id;
  const statusName = data.status?.name?.toLowerCase();
  const isActive = statusId === undefined || statusId === 1 || statusName === 'active';

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
    `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() ||
    data.username ||
    data.email ||
    'người dùng này';

  const handleLoginAs = async () => {
    if (!isSuperAdmin || isSelf || !isActive || isLoggingAs) return;
    setIsLoggingAs(true);
    try {
      const result = await loginAsUser(data.id);
      if (!result?.token || !result?.user) {
        throw new Error('Không nhận được thông tin phiên đóng vai hợp lệ.');
      }
      const targetUser = tokenManager.notifyImpersonationStart(
        result.user,
        result.token,
        result.refreshToken
      );
      showApiSuccessToast(`Đang đóng vai tài khoản: ${targetUser.name}`);
      const targetUrl = getDefaultPathForRole(targetUser.role);
      window.location.replace(targetUrl);
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể đóng vai vào tài khoản này. Vui lòng thử lại.');
      setIsLoggingAs(false);
    }
  };

  return (
    <div className='flex items-center justify-end gap-1.5'>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent id='delete-user-dialog' className='sm:max-w-105 p-2.5'>
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

      <UserFormDialog user={data} open={editOpen} onOpenChange={setEditOpen} />

      {isSuperAdmin && !isSelf && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!isActive || isLoggingAs}
          onClick={handleLoginAs}
          data-testid={`btn-login-as-user-${data.id}`}
          title={
            isActive
              ? `Đóng vai đăng nhập vào tài khoản ${displayName}`
              : 'Tài khoản đang ngừng hoạt động'
          }
          className='h-7 px-2 text-[11px] font-medium gap-1 text-indigo-700 border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 cursor-pointer'
        >
          {isLoggingAs ? (
            <Icons.spinner className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Icons.login className='h-3.5 w-3.5' />
          )}
          <span>Đóng vai</span>
        </Button>
      )}

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
            {isSuperAdmin && !isSelf && (
              <>
                <DropdownMenuItem
                  onClick={handleLoginAs}
                  disabled={!isActive || isLoggingAs}
                  className='cursor-pointer text-indigo-600 dark:text-indigo-400 focus:text-indigo-700'
                  data-testid={`menu-login-as-user-${data.id}`}
                >
                  <Icons.login className='mr-2 h-4 w-4' /> Đóng vai (Login as)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
    </div>
  );
}
