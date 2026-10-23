import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@dodecagon/ui';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { memo } from 'react';

type TPluginAvatarProps = {
  name?: string;
  avatarUrl?: string;
  className?: string;
};

const PluginAvatar = memo(
  ({ name, avatarUrl, className }: TPluginAvatarProps) => {
    return (
      <div className="relative w-fit h-fit">
        <Avatar className={cn('h-8 w-8', className)}>
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-primary/10 text-xs">
            {name ? (
              getInitialsFromName(name)
            ) : (
              <CpuChipIcon className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
);

export { PluginAvatar };
