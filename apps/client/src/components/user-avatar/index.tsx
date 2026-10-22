import { useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { cn } from '@/lib/utils';
import { UserStatus } from '@dodecagon/shared';
import { Avatar, AvatarFallback } from '@dodecagon/ui';
import { AvatarImage } from '@radix-ui/react-avatar';
import { memo, useMemo } from 'react';
import { UserPopover } from '../user-popover';
import { UserStatusBadge } from '../user-status';

type TUserAvatarProps = {
  userId: number | null;
  className?: string;
  showUserPopover?: boolean;
  showStatusBadge?: boolean;
  statusBadgeClassName?: string;
  onClick?: () => void;
};

const UserAvatar = memo(
  ({
    userId,
    className,
    showUserPopover = false,
    showStatusBadge = true,
    statusBadgeClassName,
    onClick
  }: TUserAvatarProps) => {
    const user = useUserById(userId);
    const profileColorStyle = useMemo(
      () => ({ backgroundColor: user?.profileColor }),
      [user?.profileColor]
    );

    if (!user) return null;

    const content = (
      <div className="relative size-fit" onClick={onClick}>
        <Avatar
          className={cn('size-8 bg-muted', className)}
          style={profileColorStyle}
        >
          <AvatarImage src={getFileUrl(user.avatar)} key={user.avatarId} />
          <AvatarFallback
            className="bg-muted text-xs"
            style={profileColorStyle}
          >
            {getInitialsFromName(getRenderedUsername(user))}
          </AvatarFallback>
        </Avatar>
        {showStatusBadge && (
          <UserStatusBadge
            status={user.status || UserStatus.OFFLINE}
            className={cn('absolute bottom-0 right-0', statusBadgeClassName)}
          />
        )}
      </div>
    );

    if (!showUserPopover || userId === null) return content;

    return <UserPopover userId={userId}>{content}</UserPopover>;
  }
);

export { UserAvatar };
