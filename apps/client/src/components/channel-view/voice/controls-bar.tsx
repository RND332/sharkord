import { AudioSettingsMenu } from '@/components/audio-settings-menu';
import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Protect } from '@/components/protect';
import { useIsCurrentVoiceChannelSelected } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import {
  ComputerDesktopIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/outline';
import { ChannelPermission, Permission } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { HeadphoneOff, Headphones, MicOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { ControlToggleButton } from './control-toggle-button';
import { ReactionsButton } from './reactions-button';

type TControlsBarProps = {
  channelId: number;
  isActive: boolean;
};

const ControlsBar = memo(({ channelId, isActive }: TControlsBarProps) => {
  const {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare,
    isScreenShareSupported
  } = useVoice();
  const ownVoiceState = useOwnVoiceState();
  const { devices } = useDevices();
  const channelCan = useChannelCan(channelId);
  const isConnectedToThisChannel = useIsCurrentVoiceChannelSelected();

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  const barClass = cn(
    'relative focus-within:opacity-100 has-[[data-state=open]]:opacity-100',
    isActive ? 'opacity-100' : 'opacity-0'
  );

  const handleLeaveVoice = useCallback(() => {
    leaveVoice();
  }, []);

  return (
    <div
      className={cn(
        'flex h-[88px] shrink-0 items-center justify-center px-2 pointer-events-none sm:px-4',
        barClass
      )}
    >
      <div
        data-voice-controls
        className={cn(
          'flex items-center gap-1 rounded-full bg-nav p-1 focus-within:pointer-events-auto has-[[data-state=open]]:pointer-events-auto sm:gap-2 sm:p-2',
          isActive ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <AudioSettingsMenu kind="microphone">
          <ControlToggleButton
            enabled={ownVoiceState.micMuted}
            enabledLabel="Unmute"
            disabledLabel="Mute"
            enabledIcon={MicOff}
            disabledIcon={MicrophoneIcon}
            enabledClassName="bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive"
            onClick={toggleMic}
            disabled={!permissions.canSpeak || ownVoiceState.soundMuted}
            keepFocusableWhenDisabled
          />
        </AudioSettingsMenu>
        <AudioSettingsMenu kind="output">
          <ControlToggleButton
            enabled={ownVoiceState.soundMuted}
            enabledLabel="Undeafen"
            disabledLabel="Deafen"
            enabledIcon={HeadphoneOff}
            disabledIcon={Headphones}
            enabledClassName="bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive"
            onClick={toggleSound}
          />
        </AudioSettingsMenu>
        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel="Stop Video"
          disabledLabel="Start Video"
          enabledIcon={VideoCameraIcon}
          disabledIcon={VideoCameraSlashIcon}
          enabledClassName="bg-success-solid text-white hover:bg-success-solid/90 hover:text-white"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam || devices.voiceOnlyMode}
        />

        {isScreenShareSupported && (
          <ControlToggleButton
            enabled={ownVoiceState.sharingScreen}
            enabledLabel="Stop Sharing"
            disabledLabel="Share Screen"
            enabledIcon={ComputerDesktopIcon}
            disabledIcon={ComputerDesktopIcon}
            enabledClassName="bg-success-solid text-white hover:bg-success-solid/90 hover:text-white"
            onClick={toggleScreenShare}
            disabled={!permissions.canShareScreen || devices.voiceOnlyMode}
          />
        )}

        {isConnectedToThisChannel && (
          <Protect permission={Permission.SEND_VOICE_REACTION}>
            <ReactionsButton />
          </Protect>
        )}
        <Tooltip content="Disconnect">
          <Button
            variant="destructive"
            className="size-11 rounded-full p-0 sm:h-12 sm:w-18"
            onClick={handleLeaveVoice}
            aria-label="Disconnect"
          >
            <PhoneXMarkIcon className="size-4.5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
});

export { ControlsBar };
