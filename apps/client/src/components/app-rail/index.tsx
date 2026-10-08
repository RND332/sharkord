import { openServerScreen } from '@/features/server-screens/actions';
import { setDmsOpen } from '@/features/server/actions';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import {
  useDmsOpen,
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { Tooltip } from '@sharkord/ui';
import { MessageCircleMore, Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';

const AppRail = memo(() => {
  const { t } = useTranslation('sidebar');
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();
  const settings = usePublicServerSettings();
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();
  const ownUserId = useOwnUserId();

  const openServer = useCallback(() => {
    setDmsOpen(false);
    setSelectedChannelId(undefined);
  }, []);

  const toggleDirectMessages = useCallback(
    () => setDmsOpen(!dmsOpen),
    [dmsOpen]
  );
  const openSettings = useCallback(
    () => openServerScreen(ServerScreen.USER_SETTINGS),
    []
  );

  return (
    <nav
      aria-label="Application"
      className="hidden h-full w-[72px] shrink-0 flex-col items-center gap-3 bg-rail py-4 md:flex"
    >
      <div
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-[15px] bg-primary text-xl font-bold text-primary-foreground"
      >
        S
      </div>
      <div className="h-px w-7 bg-line" />
      <Tooltip content={serverName}>
        <button
          type="button"
          aria-label={serverName}
          aria-current={!dmsOpen ? 'page' : undefined}
          onClick={openServer}
          className={cn(
            'flex size-11 items-center justify-center rounded-[15px] bg-raised text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !dmsOpen && 'border border-primary bg-primary/10 text-foreground'
          )}
        >
          {serverName?.trim().charAt(0).toUpperCase() || 'S'}
        </button>
      </Tooltip>
      {settings?.directMessagesEnabled && (
        <Tooltip content={t('directMessages')}>
          <button
            data-testid={TestId.DM_TOGGLE}
            type="button"
            aria-label={t('directMessages')}
            aria-current={dmsOpen ? 'page' : undefined}
            onClick={toggleDirectMessages}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-[15px] bg-raised text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dmsOpen && 'border border-primary bg-primary/10 text-foreground'
            )}
          >
            <MessageCircleMore className="size-5" />
            {directMessagesUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-rail bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {directMessagesUnreadCount > 99
                  ? '99+'
                  : directMessagesUnreadCount}
              </span>
            )}
          </button>
        </Tooltip>
      )}
      <div className="flex-1" />
      <Tooltip content={t('userSettings')}>
        <button
          type="button"
          aria-label={t('userSettings')}
          onClick={openSettings}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-nav text-muted-foreground transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="size-5" />
        </button>
      </Tooltip>
      <UserAvatar
        userId={ownUserId ?? null}
        className="size-11 border border-primary"
      />
    </nav>
  );
});

export { AppRail };
