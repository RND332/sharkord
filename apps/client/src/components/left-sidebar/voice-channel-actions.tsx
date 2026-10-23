import { ServerScreen } from '@/components/server-screens/screens';
import { openVoiceChatSidebar } from '@/features/app/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { useCan } from '@/features/server/hooks';
import { Permission } from '@dodecagon/shared';
import { IconButton, Tooltip } from '@dodecagon/ui';
import { ChatBubbleLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getVoiceChannelActions } from './helpers';

type TVoiceChannelActionsProps = {
  channelId: number;
};

const ChatAction = memo(({ channelId }: TVoiceChannelActionsProps) => {
  const { t } = useTranslation('sidebar');

  const onChatClick = useCallback(() => {
    openVoiceChatSidebar(channelId);
  }, [channelId]);

  return (
    <Tooltip content={t('openChat')}>
      <IconButton
        variant="ghost"
        size="sm"
        icon={ChatBubbleLeftIcon}
        onClick={onChatClick}
        aria-label={t('openChat')}
      />
    </Tooltip>
  );
});

const SettingsAction = memo(({ channelId }: TVoiceChannelActionsProps) => {
  const { t } = useTranslation('sidebar');

  const onSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.CHANNEL_SETTINGS, { channelId });
  }, [channelId]);

  return (
    <Tooltip content={t('configureChannel')}>
      <IconButton
        variant="ghost"
        size="sm"
        icon={Cog6ToothIcon}
        onClick={onSettingsClick}
        aria-label={t('configureChannel')}
      />
    </Tooltip>
  );
});

// the actions of a voice channel replace its context menu, they stay hidden
// until the row is hovered or one of them is focused
const VoiceChannelActions = memo(({ channelId }: TVoiceChannelActionsProps) => {
  const can = useCan();

  const canEditChannel = can([
    Permission.MANAGE_CHANNELS,
    Permission.MANAGE_CHANNEL_PERMISSIONS
  ]);

  const actions = getVoiceChannelActions(canEditChannel);

  return (
    <div className="absolute right-2.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
      {actions.map((action) => {
        if (action === 'chat') {
          return <ChatAction key={action} channelId={channelId} />;
        }

        return <SettingsAction key={action} channelId={channelId} />;
      })}
    </div>
  );
});

export { VoiceChannelActions };
