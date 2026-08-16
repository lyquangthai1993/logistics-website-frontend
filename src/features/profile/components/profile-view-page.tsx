'use client';

import { useAuthStore } from '@/stores/use-auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DISPATCHER: 'Dispatcher',
  FLEET_MANAGER: 'Fleet Manager',
  WAREHOUSE_MANAGER: 'Warehouse Manager'
};

export default function ProfileViewPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className='flex w-full flex-col items-center justify-center p-4'>
        <p className='text-muted-foreground'>Không có thông tin người dùng.</p>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col p-4'>
      <Card className='mx-auto max-w-lg'>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>Thông tin cá nhân và vai trò của bạn trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center gap-4'>
            <Avatar className='h-16 w-16'>
              <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
              <AvatarFallback className='text-lg'>
                {user.name?.slice(0, 2)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className='text-lg font-semibold'>{user.name}</h3>
              <p className='text-muted-foreground text-sm'>{user.email}</p>
            </div>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Vai trò</span>
              <Badge variant='secondary'>{roleLabels[user.role] || user.role}</Badge>
            </div>
            {user.warehouseId && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>Kho</span>
                <span className='text-sm font-medium'>{user.warehouseId}</span>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>ID</span>
              <span className='text-muted-foreground font-mono text-xs'>{user.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
