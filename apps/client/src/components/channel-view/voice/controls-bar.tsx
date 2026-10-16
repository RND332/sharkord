import { AudioSettingsMenu } from '@/components/audio-settings-menu';
import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Protect } from '@/components/protect';
import { useIsCurrentVoiceChannelSelected } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import {
  useAlwaysShowVoiceControls,
  useOwnVoiceState,
  useVoice
} from '@/features/server/voice/hooks';
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
import { HeadphoneOff, Headphones, MicOff, ScreenShareOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { ControlToggleButton } from './control-toggle-button';
import { ReactionsButton } from './reactions-button';

type TControlsBarProps = {
  channelId: number;
};

const ControlsBar = memo(({ channelId }: TControlsBarProps) => {
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
  const alwaysShowControls = useAlwaysShowVoiceControls();
  const isConnectedToThisChannel = useIsCurrentVoiceChannelSelected();

  const permissions = useMemo(
    () => ({
      canSpeak: channelCan(ChannelPermission.SPEAK),
      canWebcam: channelCan(ChannelPermission.WEBCAM),
      canShareScreen: channelCan(ChannelPermission.SHARE_SCREEN)
    }),
    [channelCan]
  );

  const barClass = alwaysShowControls
    ? 'relative'
    : 'absolute bottom-0 left-0 right-0 transition-[opacity,translate] duration-150 ease-out invisible opacity-0 translate-y-3 group-hover/voice-stage:visible group-hover/voice-stage:opacity-100 group-hover/voice-stage:translate-y-0';

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
        className="flex items-center gap-1 rounded-full bg-nav p-1 pointer-events-auto sm:gap-2 sm:p-2"
      >
        <div className="flex items-center">
          <ControlToggleButton
            enabled={ownVoiceState.micMuted}
            enabledLabel="Unmute"
            disabledLabel="Mute"
            enabledIcon={MicOff}
            disabledIcon={MicrophoneIcon}
            enabledClassName="bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive"
            onClick={toggleMic}
            disabled={!permissions.canSpeak || ownVoiceState.soundMuted}
          />

          <AudioSettingsMenu kind="microphone" />
        </div>
        <div className="flex items-center">
          <ControlToggleButton
            enabled={ownVoiceState.soundMuted}
            enabledLabel="Undeafen"
            disabledLabel="Deafen"
            enabledIcon={HeadphoneOff}
            disabledIcon={Headphones}
            enabledClassName="bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-destructive"
            onClick={toggleSound}
          />

          <AudioSettingsMenu kind="output" />
        </div>
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
            enabledIcon={ScreenShareOff}
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
