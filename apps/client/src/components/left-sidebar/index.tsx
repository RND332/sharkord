import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useDmsOpen,
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { memo } from 'react';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
import { useFollowVoiceMove, useRestoreLastSelectedChannel } from './hooks';
import { PluginButtons } from './plugin-buttons';
import { ServerDropdownMenu } from './server-dropdown';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 252;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 252;

type TLeftSidebarProps = {
  className?: string;
};

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();
  const publicSettings = usePublicServerSettings();

  useRestoreLastSelectedChannel();
  useFollowVoiceMove();

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      className={cn('h-full bg-nav', className)}
      data-testid={TestId.LEFT_SIDEBAR}
    >
      <div className="flex h-14 w-full items-center justify-between border-b border-line px-4">
        <h2
          className="truncate text-base font-semibold text-foreground"
          onClick={() => setSelectedChannelId(undefined)}
          data-testid={TestId.LEFT_SIDEBAR_SERVER_NAME}
        >
          {serverName}
        </h2>
        <div>
          <ServerDropdownMenu />
        </div>
      </div>
      {publicSettings?.directMessagesEnabled && <DmButton />}
      <PluginButtons />
      <div className="flex-1 overflow-y-auto">
        {dmsOpen ? <DirectMessages /> : <Categories />}
      </div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { LeftSidebar };
