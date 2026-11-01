'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/stores/use-auth-store';
import { tokenManager, getDefaultPathForRole } from '@/lib/token-manager';
import { getUsers, loginAsUser } from '@/features/users/api/service';
import type { User as ApiUser } from '@/features/users/api/types';
import { showApiErrorToast, showApiSuccessToast } from '@/lib/api-error';

const ROLE_LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DISPATCHER: 'Điều phối viên',
  FLEET_MANAGER: 'Quản lý đội xe',
  WAREHOUSE_MANAGER: 'Quản lý kho'
};

function getApiUserRoleLabel(u: ApiUser): { label: string; badgeClass: string } {
  const roleId = u.role?.id;
  const roleName = u.role?.name || '';
  if (roleId === 1 || roleName === 'SUPER_ADMIN' || roleName === 'Super Admin') {
    return {
      label: 'Super Admin',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20'
    };
  }
  if (roleId === 2 || roleName === 'DISPATCHER' || roleName === 'Dispatcher') {
    return {
      label: 'Điều phối viên',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20'
    };
  }
  if (roleId === 3 || roleName === 'FLEET_MANAGER' || roleName === 'Fleet Manager') {
    return {
      label: 'Quản lý đội xe',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20'
    };
  }
  if (roleId === 4 || roleName === 'WAREHOUSE_MANAGER' || roleName === 'Warehouse Manager') {
    return {
      label: 'Quản lý kho',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
    };
  }
  return {
    label: u.role?.displayName || roleName || 'Người dùng',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20'
  };
}

export function ImpersonationControl() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<number | string | null>(null);
  const [search, setSearch] = useState('');

  const user = useAuthStore((s) => s.user);
  const impersonator = useAuthStore((s) => s.impersonator);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isImpersonating = Boolean(impersonator);
  const canUseLoginAs = isSuperAdmin || isImpersonating;

  useEffect(() => {
    if (!open || !canUseLoginAs) return;
    let active = true;
    setLoadingUsers(true);
    getUsers({ page: 1, limit: 50 })
      .then((res) => {
        if (active) {
          setUsers(res.data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, [open, canUseLoginAs]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const statusId = u.status?.id;
      const statusName = u.status?.name?.toLowerCase();
      const isActive = statusId === undefined || statusId === 1 || statusName === 'active';
      if (!isActive) return false;
      if (String(u.id) === String(user?.id)) return false;

      if (!q) return true;
      const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
      const username = (u.username ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const hubName = (u.hub?.name ?? '').toLowerCase();
      const roleInfo = getApiUserRoleLabel(u).label.toLowerCase();
      return (
        fullName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        hubName.includes(q) ||
        roleInfo.includes(q)
      );
    });
  }, [users, search, user?.id]);

  if (!mounted || !canUseLoginAs) {
    return null;
  }

  const handleSelectUser = async (target: ApiUser) => {
    if (switchingUserId !== null) return;
    setSwitchingUserId(target.id);
    try {
      const result = await loginAsUser(target.id);
      if (!result?.token || !result?.user) {
        throw new Error('Không nhận được mã xác thực đóng vai hợp lệ.');
      }
      const normalizedTarget = tokenManager.notifyImpersonationStart(
        result.user,
        result.token,
        result.refreshToken
      );
      showApiSuccessToast(`Đang đóng vai tài khoản: ${normalizedTarget.name}`);
      setOpen(false);
      window.location.replace(getDefaultPathForRole(normalizedTarget.role));
    } catch (err: any) {
      showApiErrorToast(err, 'Không thể đóng vai vào tài khoản này.');
      setSwitchingUserId(null);
    }
  };

  const handleExitImpersonation = () => {
    const restoredAdmin = tokenManager.notifyImpersonationStop();
    if (restoredAdmin) {
      showApiSuccessToast(`Đã quay lại tài khoản quản trị: ${restoredAdmin.name}`);
      window.location.replace('/dashboard/users');
    }
  };

  const activeRoleLabel = user?.role ? ROLE_LABEL_MAP[user.role] || user.role : '';
  const activeHubName = user?.hub?.name;

  return (
    <div className='flex items-center gap-1.5 shrink-0'>
      {isImpersonating && (
        <div
          data-testid='impersonation-active-banner'
          className='flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs text-amber-900 shadow-xs dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
        >
          <Icons.userPen className='h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400' />
          <span className='hidden sm:inline font-medium'>Đang đóng vai:</span>
          <strong className='font-semibold truncate max-w-44'>
            {user?.name || user?.username || user?.email}
          </strong>
          {activeRoleLabel && (
            <span className='hidden xl:inline text-[11px] text-amber-700 dark:text-amber-300'>
              ({activeRoleLabel}
              {activeHubName ? ` • ${activeHubName}` : ''})
            </span>
          )}
          <Button
            type='button'
            size='sm'
            variant='default'
            onClick={handleExitImpersonation}
            data-testid='btn-exit-impersonation'
            className='h-6 px-2 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white border-0 cursor-pointer ml-1 shrink-0'
          >
            Thoát đóng vai
          </Button>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type='button'
              variant='outline'
              size='sm'
              data-testid='header-login-as-trigger'
              className='h-8 px-2.5 text-xs font-medium gap-1.5 whitespace-nowrap shrink-0 border-indigo-200 bg-indigo-50/90 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-900 cursor-pointer'
            />
          }
        >
          <Icons.login className='h-3.5 w-3.5 shrink-0' />
          <span className='hidden sm:inline'>
            {isImpersonating ? 'Đổi tài khoản' : 'Đóng vai (Login as)'}
          </span>
          <Icons.chevronDown className='h-3 w-3 opacity-70 shrink-0' />
        </PopoverTrigger>
        <PopoverContent
          align='end'
          className='w-80 p-2 gap-1.5 bg-white dark:bg-slate-900 border border-border shadow-xl'
        >
          <div className='flex items-center justify-between border-b pb-1.5'>
            <div className='flex flex-col'>
              <span className='text-xs font-semibold text-foreground'>
                Đóng vai người dùng (Login as)
              </span>
              <span className='text-[10px] text-muted-foreground'>
                Chuyển nhanh sang góc nhìn của nhân sự
              </span>
            </div>
            {isImpersonating && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleExitImpersonation}
                className='h-6 px-1.5 text-[10px] font-medium text-amber-600 hover:text-amber-700 cursor-pointer'
              >
                Về Super Admin
              </Button>
            )}
          </div>

          <div className='relative'>
            <Icons.search className='text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Tìm tên, username, vai trò, kho...'
              data-testid='header-login-as-search'
              className='h-7 pl-7 pr-2 text-xs bg-background'
            />
          </div>

          <div className='max-h-64 overflow-y-auto divide-y divide-border/60 rounded border bg-background'>
            {loadingUsers ? (
              <div className='flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground'>
                <Icons.spinner className='h-3.5 w-3.5 animate-spin' />
                <span>Đang tải danh sách tài khoản...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className='py-3 text-center text-xs text-muted-foreground'>
                Không tìm thấy tài khoản phù hợp
              </div>
            ) : (
              filteredUsers.map((u) => {
                const fullName =
                  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() ||
                  u.username ||
                  u.email ||
                  `User #${u.id}`;
                const roleInfo = getApiUserRoleLabel(u);
                const isSwitching = switchingUserId === u.id;

                return (
                  <button
                    key={u.id}
                    type='button'
                    disabled={switchingUserId !== null}
                    onClick={() => handleSelectUser(u)}
                    data-testid={`header-login-as-item-${u.username || u.id}`}
                    className='flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/70 transition-colors cursor-pointer disabled:opacity-50'
                  >
                    <div className='flex flex-col min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-semibold text-foreground truncate'>
                          {fullName}
                        </span>
                        {u.username && (
                          <span className='text-[10px] font-mono text-muted-foreground truncate'>
                            @{u.username}
                          </span>
                        )}
                      </div>
                      <div className='flex flex-wrap items-center gap-1 mt-0.5'>
                        <Badge
                          variant='outline'
                          className={`text-[10px] px-1 py-0 h-4 ${roleInfo.badgeClass}`}
                        >
                          {roleInfo.label}
                        </Badge>
                        {u.hub?.name && (
                          <span className='text-[10px] text-muted-foreground truncate'>
                            • {u.hub.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='shrink-0'>
                      {isSwitching ? (
                        <Icons.spinner className='h-3.5 w-3.5 animate-spin text-indigo-600' />
                      ) : (
                        <Icons.login className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
