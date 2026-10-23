import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { PluginSlot, TestId } from '@dodecagon/shared';
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
      <div className="flex h-12 w-full items-center justify-between border-b border-line px-4">
        <h2
          className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-foreground"
          onClick={() => setSelectedChannelId(undefined)}
          data-testid={TestId.LEFT_SIDEBAR_SERVER_NAME}
        >
          <img src="/mark.svg" alt="" className="size-6 shrink-0" />
          <span className="truncate">{serverName}</span>
        </h2>
        <div className="flex items-center gap-1">
          <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
          <ServerDropdownMenu />
        </div>
      </div>
      {publicSettings?.directMessagesEnabled && <DmButton />}
      <PluginButtons />
      <div className="flex-1 overflow-y-auto">
        {publicSettings?.directMessagesEnabled && <DirectMessages />}
        <Categories />
      </div>
      <div
        data-voice-dock
        className="mx-2 mb-2 flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-line bg-canvas"
      >
        <VoiceControl />
        <UserControl />
      </div>
    </ResizableSidebar>
  );
});

export { LeftSidebar };
