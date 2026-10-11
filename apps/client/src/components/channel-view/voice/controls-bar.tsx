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
import { ChannelPermission, Permission } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff
} from 'lucide-react';
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
        'flex h-[88px] items-center justify-center gap-2.5 px-4 pointer-events-none',
        barClass
      )}
    >
      <div className="flex items-center gap-2.5 pointer-events-auto">
        <ControlToggleButton
          enabled={ownVoiceState.micMuted}
          enabledLabel="Unmute"
          disabledLabel="Mute"
          enabledIcon={MicOff}
          disabledIcon={Mic}
          enabledClassName="bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500"
          onClick={toggleMic}
          disabled={!permissions.canSpeak || ownVoiceState.soundMuted}
        />

        <ControlToggleButton
          enabled={ownVoiceState.soundMuted}
          enabledLabel="Undeafen"
          disabledLabel="Deafen"
          enabledIcon={HeadphoneOff}
          disabledIcon={Headphones}
          enabledClassName="bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-500"
          onClick={toggleSound}
        />

        <ControlToggleButton
          enabled={ownVoiceState.webcamEnabled}
          enabledLabel="Stop Video"
          disabledLabel="Start Video"
          enabledIcon={Video}
          disabledIcon={VideoOff}
          enabledClassName="bg-green-500/20 text-green-500 hover:bg-green-500/30 hover:text-green-500"
          onClick={toggleWebcam}
          disabled={!permissions.canWebcam || devices.voiceOnlyMode}
        />

        {isScreenShareSupported && (
          <ControlToggleButton
            enabled={ownVoiceState.sharingScreen}
            enabledLabel="Stop Sharing"
            disabledLabel="Share Screen"
            enabledIcon={ScreenShareOff}
            disabledIcon={Monitor}
            enabledClassName="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 hover:text-blue-500"
            onClick={toggleScreenShare}
            disabled={!permissions.canShareScreen || devices.voiceOnlyMode}
          />
        )}

        {isConnectedToThisChannel && (
          <Protect permission={Permission.SEND_VOICE_REACTION}>
            <ReactionsButton />
          </Protect>
        )}
      </div>
      <Tooltip content="Disconnect">
        <Button
          className="pointer-events-auto size-10.5 rounded-lg bg-danger-solid p-0 text-white hover:bg-destructive/80"
          onClick={handleLeaveVoice}
          aria-label="Disconnect"
        >
          <PhoneOff className="size-4.5" fill="currentColor" />
        </Button>
      </Tooltip>
    </div>
  );
});

export { ControlsBar };
