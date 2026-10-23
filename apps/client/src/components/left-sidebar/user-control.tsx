import { AudioSettingsMenu } from '@/components/audio-settings-menu';
import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, TestId } from '@dodecagon/shared';
import {
  Button,
  HeadphonesIcon,
  HeadphonesOffIcon,
  MicOffIcon
} from '@dodecagon/ui';
import { Cog6ToothIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);
  const microphoneDisabled =
    !channelCan(ChannelPermission.SPEAK) || ownVoiceState.soundMuted;
  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  if (!ownPublicUser) return null;

  return (
    <div className="flex h-[52px] w-full shrink-0 items-center gap-1.5 bg-rail px-2.5">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5">
          <UserAvatar
            userId={ownPublicUser.id}
            className="size-8 shrink-0"
            showUserPopover={false}
            statusBadgeClassName="right-px bottom-px size-[9px] border-accent"
          />
          <div className="flex h-[30px] min-w-0 flex-1 flex-col justify-center gap-px">
            <span className="truncate select-text text-[13px] font-semibold leading-4 text-foreground">
              {ownPublicUser.name}
            </span>
            <span className="truncate text-xs leading-4 text-muted-foreground capitalize">
              {ownPublicUser.status}
            </span>
          </div>
        </div>
      </UserPopover>

      <div className="flex shrink-0 items-center gap-1.5">
        <AudioSettingsMenu kind="microphone">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-7 rounded-[6px] p-0',
              microphoneDisabled && 'opacity-60',
              ownVoiceState.micMuted
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400'
                : 'text-muted-foreground hover:bg-raised hover:text-foreground'
            )}
            onClick={microphoneDisabled ? undefined : toggleMic}
            title={ownVoiceState.micMuted ? t('unmuteMic') : t('muteMic')}
            aria-disabled={microphoneDisabled || undefined}
          >
            {ownVoiceState.micMuted ? (
              <MicOffIcon className="size-5" />
            ) : (
              <MicrophoneIcon className="size-5" />
            )}
          </Button>
        </AudioSettingsMenu>
        <AudioSettingsMenu kind="output">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-7 rounded-[6px] p-0',
              ownVoiceState.soundMuted
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400'
                : 'text-muted-foreground hover:bg-raised hover:text-foreground'
            )}
            onClick={toggleSound}
            title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
          >
            {ownVoiceState.soundMuted ? (
              <HeadphonesOffIcon className="size-5" />
            ) : (
              <HeadphonesIcon className="size-5" />
            )}
          </Button>
        </AudioSettingsMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-7 rounded-[6px] p-0 text-muted-foreground hover:bg-raised hover:text-foreground"
          data-testid={TestId.USER_SETTINGS_TRIGGER}
          onClick={handleSettingsClick}
          title={t('userSettings')}
          aria-label={t('userSettings')}
        >
          <Cog6ToothIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
