'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { createUserMutation, updateUserMutation } from '../api/mutations';
import { userKeys } from '../api/queries';
import type { User, CreateUserPayload, UpdateUserPayload } from '../api/types';
import { ROLE_OPTIONS, STATUS_OPTIONS } from './users-table/options';
import { activeHubsQueryOptions } from '@/features/hubs/api/queries';

const WAREHOUSE_MANAGER_ROLE_ID = '4';

interface UserFormDialogProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormDialog({ user, open, onOpenChange }: UserFormDialogProps) {
  const isEdit = !!user;
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [statusId, setStatusId] = useState('1');
  const [hubId, setHubId] = useState('');

  const isWarehouseManager = roleId === WAREHOUSE_MANAGER_ROLE_ID;

  const { data: activeHubs = [], isLoading: hubsLoading } = useQuery({
    ...activeHubsQueryOptions(),
    enabled: open && isWarehouseManager,
  });

  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setEmail(user.email || '');
        setUsername(user.username || '');
        setPassword('');
        setRoleId(user.role?.id ? String(user.role.id) : '2');
        setStatusId(user.status?.id ? String(user.status.id) : '1');
        setHubId(user.hub?.id ? String(user.hub.id) : '');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setUsername('');
        setPassword('');
        setRoleId('2');
        setStatusId('1');
        setHubId('');
      }
    }
  }, [user, open]);

  useEffect(() => {
    if (!isWarehouseManager) setHubId('');
  }, [isWarehouseManager]);

  const createMutation = useMutation({
    ...createUserMutation,
    onSuccess: () => {
      showApiSuccessToast('Tạo người dùng thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể tạo người dùng. Vui lòng thử lại.');
    }
  });

  const updateMutation = useMutation({
    ...updateUserMutation,
    onSuccess: () => {
      showApiSuccessToast('Cập nhật người dùng thành công!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể cập nhật người dùng. Vui lòng thử lại.');
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) return;
    if (!isEdit && (!password || password.length < 6)) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (isEdit && password && password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    const hubPayload = isWarehouseManager && hubId ? { id: Number(hubId) } : null;

    if (isEdit && user) {
      const payload: UpdateUserPayload = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        ...(trimmedUsername ? { username: trimmedUsername } : {}),
        ...(password ? { password } : {}),
        role: { id: Number(roleId) },
        status: { id: Number(statusId) },
        hub: hubPayload,
      };
      updateMutation.mutate({ id: user.id, values: payload });
    } else {
      const payload: CreateUserPayload = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        ...(trimmedUsername ? { username: trimmedUsername } : {}),
        ...(password ? { password } : {}),
        role: { id: Number(roleId) },
        status: { id: Number(statusId) },
        hub: hubPayload,
      };
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]' id='user-form-dialog'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <Icons.user className='h-5 w-5 text-primary' />
            {isEdit ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng Mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label htmlFor='input-user-first-name' className='text-xs font-semibold text-muted-foreground'>
                Họ và tên đệm *
              </label>
              <Input
                id='input-user-first-name'
                required
                placeholder='VD: Nguyễn Văn'
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='input-user-last-name' className='text-xs font-semibold text-muted-foreground'>
                Tên *
              </label>
              <Input
                id='input-user-last-name'
                required
                placeholder='VD: An'
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='input-user-email' className='text-xs font-semibold text-muted-foreground'>
              Địa chỉ Email *
            </label>
            <Input
              id='input-user-email'
              type='email'
              required
              placeholder='VD: user@logistics.vn'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='input-user-username' className='text-xs font-semibold text-muted-foreground'>
              Tên đăng nhập (Username)
            </label>
            <Input
              id='input-user-username'
              placeholder='VD: quanlikho1'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='input-user-password' className='text-xs font-semibold text-muted-foreground'>
              {isEdit ? 'Mật khẩu mới (Tùy chọn)' : 'Mật khẩu *'}
            </label>
            <Input
              id='input-user-password'
              type='password'
              required={!isEdit}
              placeholder={isEdit ? 'Để trống nếu không muốn đổi' : 'Tối thiểu 6 ký tự'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label htmlFor='select-user-role' className='text-xs font-semibold text-muted-foreground'>
                Vai trò (Role) *
              </label>
              <select
                id='select-user-role'
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className='space-y-1.5'>
              <label htmlFor='select-user-status' className='text-xs font-semibold text-muted-foreground'>
                Trạng thái *
              </label>
              <select
                id='select-user-status'
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hub — chỉ hiện khi role = WAREHOUSE_MANAGER */}
          {isWarehouseManager && (
            <div className='space-y-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3'>
              <label htmlFor='select-user-hub' className='text-xs font-semibold text-primary flex items-center gap-1.5'>
                <Icons.warehouse className='h-3.5 w-3.5' />
                Kho phụ trách (Hub)
              </label>
              <select
                id='select-user-hub'
                value={hubId}
                onChange={(e) => setHubId(e.target.value)}
                disabled={hubsLoading}
                className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer disabled:opacity-50'
              >
                <option value=''>
                  {hubsLoading ? 'Đang tải...' : '— Chưa gán kho —'}
                </option>
                {activeHubs.map((hub) => (
                  <option key={hub.id} value={String(hub.id)}>
                    [{hub.code}] {hub.name} — {hub.city}
                  </option>
                ))}
              </select>
              <p className='text-[11px] text-muted-foreground'>
                Mỗi tài khoản Quản lý kho được gán vào một Hub cụ thể.
              </p>
            </div>
          )}

          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='cursor-pointer'
            >
              Hủy Bỏ
            </Button>
            <Button
              type='submit'
              disabled={isPending}
              className='bg-primary text-primary-foreground cursor-pointer'
            >
              {isPending
                ? 'Đang lưu...'
                : isEdit
                  ? 'Lưu Thay Đổi'
                  : 'Thêm Người Dùng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserFormDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        id='btn-add-user'
        onClick={() => setOpen(true)}
        className='bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer transition-all duration-150'
      >
        <Icons.add className='mr-2 h-4 w-4' />
        Thêm Người Dùng
      </Button>
      <UserFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
