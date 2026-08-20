'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useMutation } from '@tanstack/react-query';
import { createUserMutation, updateUserMutation } from '../api/mutations';
import type { User, CreateUserPayload, UpdateUserPayload } from '../api/types';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';
import { toast } from 'sonner';
import { ROLE_OPTIONS, STATUS_OPTIONS } from './users-table/options';

interface UserFormSheetProps {
  user?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ user, open, onOpenChange }: UserFormSheetProps) {
  const isEdit = !!user;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [statusId, setStatusId] = useState('1');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setUsername(user.username || '');
      setPassword('');
      setRoleId(user.role?.id ? String(user.role.id) : '2');
      setStatusId(user.status?.id ? String(user.status.id) : '1');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setRoleId('2');
      setStatusId('1');
    }
  }, [user, open]);

  const createMutation = useMutation({
    ...createUserMutation,
    onSuccess: () => {
      showApiSuccessToast('Tạo người dùng thành công!');
      onOpenChange(false);
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
    },
    onError: (err: any) => {
      showApiErrorToast(err, 'Không thể cập nhật người dùng. Vui lòng thử lại.');
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedFirstName) {
      toast.error('Vui lòng nhập họ và tên đệm');
      return;
    }
    if (!trimmedLastName) {
      toast.error('Vui lòng nhập tên');
      return;
    }
    if (!trimmedEmail) {
      toast.error('Vui lòng nhập email');
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (isEdit && password && password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (isEdit && user) {
      const updatePayload: UpdateUserPayload = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        ...(trimmedUsername ? { username: trimmedUsername } : {}),
        ...(password ? { password } : {}),
        role: { id: Number(roleId) },
        status: { id: Number(statusId) }
      };
      updateMutation.mutate({ id: user.id, values: updatePayload });
    } else {
      const createPayload: CreateUserPayload = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        ...(trimmedUsername ? { username: trimmedUsername } : {}),
        ...(password ? { password } : {}),
        role: { id: Number(roleId) },
        status: { id: Number(statusId) }
      };
      createMutation.mutate(createPayload);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-[540px]'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2 text-lg font-bold'>
            <Icons.user className='h-5 w-5 text-primary' />
            {isEdit ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng Mới'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Cập nhật thông tin chi tiết và phân quyền người dùng trong hệ thống.'
              : 'Điền thông tin bên dưới để tạo tài khoản người dùng mới.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto py-2'>
          <form id='user-form-sheet' className='space-y-4 p-1' onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label
                  htmlFor='input-user-first-name'
                  className='text-xs font-semibold text-muted-foreground'
                >
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
                <label
                  htmlFor='input-user-last-name'
                  className='text-xs font-semibold text-muted-foreground'
                >
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
              <label
                htmlFor='input-user-email'
                className='text-xs font-semibold text-muted-foreground'
              >
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
              <label
                htmlFor='input-user-username'
                className='text-xs font-semibold text-muted-foreground'
              >
                Tên đăng nhập (Username)
              </label>
              <Input
                id='input-user-username'
                placeholder='VD: nguyenvanan'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='input-user-password'
                className='text-xs font-semibold text-muted-foreground'
              >
                {isEdit ? 'Mật khẩu mới (Tùy chọn)' : 'Mật khẩu *'}
              </label>
              <Input
                id='input-user-password'
                type='password'
                required={!isEdit}
                placeholder={isEdit ? 'Để trống nếu không muốn đổi mật khẩu' : 'Tối thiểu 6 ký tự'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isEdit && (
                <p className='text-[11px] text-muted-foreground'>
                  Chỉ nhập nếu bạn muốn cập nhật mật khẩu đăng nhập của người dùng này.
                </p>
              )}
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label
                  htmlFor='select-user-role'
                  className='text-xs font-semibold text-muted-foreground'
                >
                  Vai trò hệ thống (TMS Role) *
                </label>
                <select
                  id='select-user-role'
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='select-user-status'
                  className='text-xs font-semibold text-muted-foreground'
                >
                  Trạng thái tài khoản *
                </label>
                <select
                  id='select-user-status'
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className='w-full h-9 px-3 text-sm bg-background border border-input rounded-md cursor-pointer'
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        <SheetFooter className='pt-4 gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='cursor-pointer'
          >
            Hủy
          </Button>
          <Button
            type='submit'
            id='btn-submit-user'
            form='user-form-sheet'
            disabled={isPending}
            className='bg-primary text-primary-foreground cursor-pointer'
          >
            {isPending
              ? 'Đang lưu...'
              : isEdit
                ? 'Lưu Thay Đổi'
                : 'Thêm Người Dùng'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function UserFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        id='btn-add-user'
        onClick={() => setOpen(true)}
        className='bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer transition-all duration-150'
      >
        <Icons.add className='mr-2 h-4 w-4' />
        Thêm người dùng
      </Button>
      <UserFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
