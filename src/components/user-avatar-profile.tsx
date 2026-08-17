import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: {
    avatarUrl?: string;
    photo?: { path?: string } | null;
    name?: string | null;
    email: string;
  } | null;
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  const avatarSrc = user?.avatarUrl || user?.photo?.path || '';

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={avatarSrc} alt={user?.name || ''} />
        <AvatarFallback className='rounded-lg'>{getInitials(user?.name, 'CN')}</AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{user?.name || ''}</span>
          <span className='truncate text-xs'>{user?.email || ''}</span>
        </div>
      )}
    </div>
  );
}
