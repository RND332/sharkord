import { Dialog } from '@/components/dialogs/dialogs';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { toggleChannelMuted } from '@/features/app/actions';
import { useIsChannelMuted } from '@/features/app/hooks';
import { openDialog } from '@/features/dialogs/actions';
import { useChannelById } from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { ChannelType, PluginSlot, UserStatus } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import {
  BellOff,
  Hash,
  MessageCircleMore,
  Search,
  Users,
  Volume2,
  X
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedMessagesPopover } from './pinned-messages-popover';

const DM_STATUS_LABEL_KEYS = {
  [UserStatus.ONLINE]: 'statusOnline',
  [UserStatus.IDLE]: 'statusIdle',
  [UserStatus.OFFLINE]: 'statusOffline'
} as const;

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
  channelId: number;
  dmPartnerId?: number;
  onClose?: () => void;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
};

const TextTopbar = memo(
  ({
    onScrollToMessage,
    channelId,
    dmPartnerId,
    onClose,
    onToggleRightSidebar,
    isRightSidebarOpen
  }: TTextTopbarProps) => {
    const { t } = useTranslation('topbar');
    const { t: tCommon } = useTranslation('common');
    const settings = usePublicServerSettings();
    const channel = useChannelById(channelId);
    const dmPartner = useUserById(dmPartnerId ?? null);
    const isMuted = useIsChannelMuted(channelId);

    const onUnmuteClick = useCallback(() => {
      toggleChannelMuted(channelId);
    }, [channelId]);

    const pluginProps = useMemo(() => ({ channelId }), [channelId]);
    const openSearchDialog = useCallback(() => {
      openDialog(Dialog.SEARCH);
    }, []);

    const info = useMemo(() => {
      if (channel?.isDm) {
        const status = dmPartner?.status ?? UserStatus.OFFLINE;
        const statusLabel = tCommon(DM_STATUS_LABEL_KEYS[status]);

        return {
          name: dmPartner?.name ?? tCommon('directMessage'),
          topic: statusLabel
        };
      }

      return {
        name: channel?.name,
        topic: channel?.topic
      };
    }, [channel, dmPartner?.name, dmPartner?.status, tCommon]);

    const getIcon = useCallback(() => {
      if (channel?.isDm) {
        return (
          <MessageCircleMore className="inline-block text-muted-foreground h-4 w-4" />
        );
      }

      if (channel?.type === ChannelType.TEXT) {
        return <Hash className="inline-block text-muted-foreground h-4 w-4" />;
      }

      if (channel?.type === ChannelType.VOICE) {
        return (
          <Volume2 className="inline-block text-muted-foreground h-4 w-4" />
        );
      }

      return null;
    }, [channel]);

    return (
      <div className="flex h-12 shrink-0 w-auto overflow-hidden border-b border-line bg-canvas">
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            {getIcon()}
            <span
              data-dm-partner={channel?.isDm ? 'true' : undefined}
              className="max-w-40 truncate text-base font-semibold"
            >
              {info.name}
            </span>
            {info.topic && (
              <span
                data-dm-presence={channel?.isDm ? 'true' : undefined}
                className="truncate border-l border-line pl-3 text-[13px] text-subtle-foreground"
              >
                {info.topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PluginSlotRenderer
              slotId={PluginSlot.CHANNEL_HEADER}
              props={pluginProps}
            />

            {isMuted && (
              <Tooltip content={t('common:channelMutedTooltip')}>
                <IconButton
                  icon={BellOff}
                  size="sm"
                  variant="ghost"
                  onClick={onUnmuteClick}
                />
              </Tooltip>
            )}
            <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />

            {settings?.enableSearch && (
              <IconButton
                onClick={openSearchDialog}
                icon={Search}
                variant="ghost"
                size="sm"
                aria-label={t('searchContent')}
              />
            )}
            {onToggleRightSidebar && (
              <IconButton
                onClick={onToggleRightSidebar}
                icon={Users}
                variant="ghost"
                size="sm"
                aria-label={
                  isRightSidebarOpen
                    ? t('closeMembersSidebar')
                    : t('openMembersSidebar')
                }
              />
            )}
            {onClose && (
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { TextTopbar };
