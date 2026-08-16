'use client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useAuthStore } from '@/stores/use-auth-store';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Ignore logout API errors
    }
    logout();
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/auth/sign-in');
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant='ghost' className='relative h-8 w-8 rounded-full' />}
        >
          <UserAvatarProfile user={user} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className='font-normal'>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm leading-none font-medium'>{user.name}</p>
                <p className='text-muted-foreground text-xs leading-none'>{user.email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
