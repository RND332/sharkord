import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import { UserAvatar } from '@/components/user-avatar';
import { useUsers } from '@/features/server/users/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  PluginSlot,
  TestId,
  UserStatus
} from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { X } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPopover } from '../user-popover';

const MAX_USERS_TO_SHOW = 100;
const MIN_WIDTH = 240;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 292;

type TUserProps = {
  userId: number;
  name: string;
  banned: boolean;
};

const User = memo(({ userId, name, banned }: TUserProps) => {
  const pluginProps = useMemo(() => ({ userId }), [userId]);

  return (
    <UserPopover userId={userId}>
      <div
        data-testid={TestId.MEMBER_ITEM}
        className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-accent select-none min-w-0"
      >
        <UserAvatar userId={userId} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            'text-sm text-foreground truncate',
            banned && 'line-through text-muted-foreground'
          )}
        >
          {name}
        </span>

        <PluginSlotRenderer
          slotId={PluginSlot.MEMBER_LIST_ITEM}
          props={pluginProps}
        />
      </div>
    </UserPopover>
  );
});

type TRightSidebarProps = {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
};

const RightSidebar = memo(
  ({ className, isOpen = true, onClose }: TRightSidebarProps) => {
    const { t } = useTranslation('sidebar');
    const { t: tTopbar } = useTranslation('topbar');
    const users = useUsers();

    const { onlineUsers, offlineUsers, usersCount } = useMemo(() => {
      const filtered = users.filter(
        (user) => user.name !== DELETED_USER_IDENTITY_AND_NAME
      );
      const online = filtered.filter(
        (user) => user.status !== UserStatus.OFFLINE
      );
      const offline = filtered.filter(
        (user) => user.status === UserStatus.OFFLINE
      );

      return {
        onlineUsers: online,
        offlineUsers: offline.slice(
          0,
          Math.max(0, MAX_USERS_TO_SHOW - online.length)
        ),
        usersCount: filtered.length
      };
    }, [users]);

    const hasHiddenUsers =
      onlineUsers.length + offlineUsers.length < usersCount;

    return (
      <ResizableSidebar
        storageKey={LocalStorageKey.RIGHT_SIDEBAR_WIDTH}
        minWidth={MIN_WIDTH}
        maxWidth={MAX_WIDTH}
        defaultWidth={DEFAULT_WIDTH}
        edge="left"
        isOpen={isOpen}
        className={cn('h-full bg-nav', className)}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('membersHeader', { count: usersCount })}
          </h3>
          {onClose && (
            <IconButton
              icon={X}
              variant="ghost"
              size="sm"
              aria-label={tTopbar('closeMembersPanel')}
              onClick={onClose}
            />
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-4">
            <section>
              <h4 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
                {t('onlineGroup', { count: onlineUsers.length })}
              </h4>
              <div className="space-y-1">
                {onlineUsers.map((user) => (
                  <User
                    key={user.id}
                    userId={user.id}
                    name={user.name}
                    banned={user.banned}
                  />
                ))}
              </div>
            </section>
            <section>
              <h4 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">
                {t('offlineGroup', { count: offlineUsers.length })}
              </h4>
              <div className="space-y-1">
                {offlineUsers.map((user) => (
                  <User
                    key={user.id}
                    userId={user.id}
                    name={user.name}
                    banned={user.banned}
                  />
                ))}
              </div>
            </section>
            {hasHiddenUsers && (
              <div className="text-sm text-muted-foreground px-2 py-1.5">
                +{usersCount - onlineUsers.length - offlineUsers.length} more...
              </div>
            )}
          </div>
        </div>
      </ResizableSidebar>
    );
  }
);

export { RightSidebar };
