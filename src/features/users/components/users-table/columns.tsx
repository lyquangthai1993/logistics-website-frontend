'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { User } from '../../api/types';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { CellAction } from './cell-action';
import { ROLE_OPTIONS } from './options';

export const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.email || '',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Họ và tên / Email' />
    ),
    cell: ({ row }) => {
      const fullName = `${row.original.firstName ?? ''} ${row.original.lastName ?? ''}`.trim();
      return (
        <div className='flex flex-col'>
          <span className='font-medium text-foreground'>
            {fullName || row.original.username || 'Không tên'}
          </span>
          <span className='text-xs text-muted-foreground'>{row.original.email}</span>
        </div>
      );
    },
    meta: {
      columnTitle: 'Họ và tên / Email',
      label: 'Họ và tên',
      placeholder: 'Tìm kiếm người dùng...',
      variant: 'text' as const,
      icon: Icons.text
    },
    enableColumnFilter: true
  },
  {
    id: 'username',
    accessorKey: 'username',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Tên đăng nhập' />
    ),
    meta: {
      columnTitle: 'Tên đăng nhập'
    },
    cell: ({ row }) => (
      <span className='text-xs font-mono text-muted-foreground'>
        {row.original.username || '—'}
      </span>
    )
  },
  {
    id: 'role',
    accessorFn: (row) => row.role?.name || row.role?.displayName || '',
    enableSorting: false,
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Vai trò' />
    ),
    cell: ({ row }) => {
      const role = row.original.role;
      const roleId = role?.id;
      const roleName =
        role?.displayName ||
        role?.name ||
        (roleId === 1
          ? 'Super Admin'
          : roleId === 2
            ? 'Điều phối viên'
            : roleId === 3
              ? 'Quản lý đội xe'
              : roleId === 4
                ? 'Quản lý kho'
                : 'Chưa phân quyền');

      let badgeClass = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20';
      if (roleId === 1 || role?.name === 'SUPER_ADMIN' || role?.name === 'Super Admin') {
        badgeClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20';
      } else if (roleId === 2 || role?.name === 'DISPATCHER' || role?.name === 'Dispatcher') {
        badgeClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20';
      } else if (roleId === 3 || role?.name === 'FLEET_MANAGER' || role?.name === 'Fleet Manager') {
        badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20';
      } else if (
        roleId === 4 ||
        role?.name === 'WAREHOUSE_MANAGER' ||
        role?.name === 'Warehouse Manager'
      ) {
        badgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      }

      return (
        <Badge variant='outline' className={`capitalize ${badgeClass}`}>
          {roleName}
        </Badge>
      );
    },
    enableColumnFilter: true,
    meta: {
      columnTitle: 'Vai trò',
      label: 'Vai trò',
      variant: 'multiSelect' as const,
      options: ROLE_OPTIONS
    }
  },
  {
    id: 'status',
    accessorFn: (row) => row.status?.name || '',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Trạng thái' />
    ),
    meta: {
      columnTitle: 'Trạng thái'
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const statusId = status?.id;
      const statusName = status?.name?.toLowerCase();
      const isActive = statusId === 1 || statusName === 'active';

      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }
        >
          {isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
        </Badge>
      );
    }
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Ngày tạo' />
    ),
    meta: {
      columnTitle: 'Ngày tạo'
    },
    cell: ({ row }) => {
      const dateVal = row.original.createdAt;
      if (!dateVal) return <span className='text-xs text-muted-foreground'>—</span>;
      try {
        const d = new Date(dateVal);
        return (
          <span className='text-xs text-muted-foreground'>
            {d.toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        );
      } catch {
        return <span className='text-xs text-muted-foreground'>{dateVal}</span>;
      }
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
