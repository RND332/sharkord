import { AudioSettingsMenu } from '@/components/audio-settings-menu';
import { openServerScreen } from '@/features/server-screens/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { ChannelPermission, TestId } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';
import { UserAvatar } from '../user-avatar';
import { UserPopover } from '../user-popover';

const revealedSettingsClass =
  'w-4 opacity-0 transition-opacity group-hover/mic:opacity-100 group-focus-within/mic:opacity-100 has-[[data-state=open]]:opacity-100';

const revealedOutputSettingsClass =
  'w-4 opacity-0 transition-opacity group-hover/output:opacity-100 group-focus-within/output:opacity-100 has-[[data-state=open]]:opacity-100';

const UserControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const ownPublicUser = useOwnPublicUser();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const { ownVoiceState, toggleMic, toggleSound } = useVoice();
  const channelCan = useChannelCan(currentVoiceChannelId);
  const handleSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  if (!ownPublicUser) return null;

  return (
    <div className="flex h-[52px] w-full shrink-0 items-center gap-2 bg-rail px-2.5">
      <UserPopover userId={ownPublicUser.id}>
        <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5">
          <UserAvatar
            userId={ownPublicUser.id}
            className="size-8 shrink-0"
            showUserPopover={false}
            statusBadgeClassName="right-px bottom-px size-[9px] border-accent"
          />
          <div className="flex h-[30px] min-w-0 flex-1 flex-col justify-center gap-px">
            <span className="truncate text-[13px] font-semibold leading-4 text-foreground">
              {ownPublicUser.name}
            </span>
            <span className="truncate text-xs leading-4 text-muted-foreground capitalize">
              {ownPublicUser.status}
            </span>
          </div>
        </div>
      </UserPopover>

      <div className="flex shrink-0 items-center gap-0.5">
        <div className="group/mic flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-8 rounded-[6px]',
              ownVoiceState.micMuted
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400'
                : 'text-muted-foreground hover:bg-raised hover:text-foreground'
            )}
            onClick={toggleMic}
            title={ownVoiceState.micMuted ? t('unmuteMic') : t('muteMic')}
            disabled={
              !channelCan(ChannelPermission.SPEAK) || ownVoiceState.soundMuted
            }
          >
            {ownVoiceState.micMuted ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </Button>
          <div className={revealedSettingsClass}>
            <AudioSettingsMenu kind="microphone" compact />
          </div>
        </div>
        <div className="group/output flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-8 rounded-[6px]',
              ownVoiceState.soundMuted
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400'
                : 'text-muted-foreground hover:bg-raised hover:text-foreground'
            )}
            onClick={toggleSound}
            title={ownVoiceState.soundMuted ? t('undeafen') : t('deafen')}
          >
            {ownVoiceState.soundMuted ? (
              <HeadphoneOff className="size-5" />
            ) : (
              <Headphones className="size-5" />
            )}
          </Button>
          <div className={revealedOutputSettingsClass}>
            <AudioSettingsMenu kind="output" compact />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-[6px] text-muted-foreground hover:bg-raised hover:text-foreground md:hidden"
          data-testid={TestId.USER_SETTINGS_TRIGGER}
          onClick={handleSettingsClick}
          title={t('userSettings')}
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
});

export { UserControl };
