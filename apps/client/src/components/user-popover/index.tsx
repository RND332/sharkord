import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { setModViewOpen, setSelectedDmChannelId } from '@/features/app/actions';
import { setDmsOpen } from '@/features/server/actions';
import { usePublicServerSettings, useUserRoles } from '@/features/server/hooks';
import { useIsOwnUser, useUserById } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import { useDateLocale } from '@/hooks/use-date-locale';
import { getTRPCClient } from '@/lib/trpc';
import {
  DELETED_USER_IDENTITY_AND_NAME,
  Permission,
  PluginSlot,
  TestId,
  UserStatus,
  getTrpcError
} from '@dodecagon/shared';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@dodecagon/ui';
import {
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Protect } from '../protect';
import { RoleBadge } from '../role-badge';
import { UserAvatar } from '../user-avatar';

type TUserPopoverProps = {
  userId: number;
  children: React.ReactNode;
};

const UserPopover = memo(({ userId, children }: TUserPopoverProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const user = useUserById(userId);
  const roles = useUserRoles(userId);
  const settings = usePublicServerSettings();
  const isOwnUser = useIsOwnUser(userId);

  const pluginProps = useMemo(() => ({ userId }), [userId]);
  const statusLabel = useMemo(() => {
    if (user?.status === UserStatus.IDLE) {
      return t('profileStatusIdle', { ns: 'settings' });
    }

    if (user?.status === UserStatus.ONLINE) {
      return t('profileStatusOnline', { ns: 'settings' });
    }

    return t('profileStatusOffline', { ns: 'settings' });
  }, [user?.status, t]);

  const onDirectMessageClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const result = await trpc.dms.open.mutate({ userId });

      setDmsOpen(true);
      setSelectedDmChannelId(result.channelId);
    } catch (error) {
      toast.error(getTrpcError(error, t('couldNotOpenDM')));
    }
  }, [userId, t]);

  if (!user) return <>{children}</>;

  const isDeleted = user.name === DELETED_USER_IDENTITY_AND_NAME;
  const showDmButton =
    settings?.directMessagesEnabled && !isDeleted && !isOwnUser;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        <div className="relative">
          {user.banned && (
            <div className="absolute right-2 top-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
              <ShieldCheckIcon className="h-3 w-3" />
              {t('bannedBadge')}
            </div>
          )}
          {isDeleted && (
            <div className="absolute right-2 top-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
              <TrashIcon className="h-3 w-3" />
              {t('deletedBadge')}
            </div>
          )}
          {user.banner ? (
            <div
              data-profile-banner
              className="h-32 w-full rounded-t-md bg-cover bg-center bg-no-repeat"
              style={{
                backgroundColor: user.profileColor || '#5865f2',
                backgroundImage: `url("${getFileUrl(user.banner)}")`
              }}
            />
          ) : (
            <div
              data-profile-banner
              className="h-32 w-full rounded-t-md"
              style={{
                background: user.profileColor || '#5865f2'
              }}
            />
          )}
          <div data-profile-avatar className="absolute left-4 top-[68px]">
            <UserAvatar
              userId={user.id}
              className="size-[120px] border-4 border-card [&_[data-slot=avatar-fallback]]:text-4xl [&_[data-slot=avatar-fallback]]:font-bold [&_[data-slot=avatar-fallback]]:text-foreground"
              statusBadgeClassName="size-5 border-4 border-card"
            />
          </div>
        </div>

        <div className="px-4 pt-16 pb-4">
          <div className="mb-3">
            <span className="text-lg font-semibold text-foreground truncate mb-1">
              {getRenderedUsername(user)}
            </span>
            <div className="text-xs text-muted-foreground capitalize">
              {statusLabel}
            </div>
          </div>

          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {roles.map((role) => (
                <RoleBadge key={role.id} role={role} />
              ))}
            </div>
          )}

          {user.bio && (
            <div className="mt-3">
              <p className="text-sm text-foreground leading-relaxed">
                {user.bio}
              </p>
            </div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t('memberSince', {
                date: format(new Date(user.createdAt), 'PP', {
                  locale: dateLocale
                })
              })}
            </p>

            <div className="flex gap-2 items-center">
              <PluginSlotRenderer
                slotId={PluginSlot.USER_POPOVER}
                props={pluginProps}
              />

              {showDmButton && (
                <IconButton
                  data-testid={TestId.USER_POPOVER_DM}
                  icon={ChatBubbleLeftIcon}
                  variant="ghost"
                  size="sm"
                  title={t('directMessage')}
                  onClick={onDirectMessageClick}
                />
              )}

              {
                <Protect permission={Permission.MANAGE_USERS}>
                  <IconButton
                    data-testid={TestId.USER_POPOVER_MODERATE}
                    icon={UserCircleIcon}
                    variant="ghost"
                    size="sm"
                    title={t('moderationView')}
                    onClick={() => setModViewOpen(true, user.id)}
                  />
                </Protect>
              }
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

UserPopover.displayName = 'UserPopover';

export { UserPopover };
