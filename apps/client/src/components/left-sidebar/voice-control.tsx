import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import {
  useChannelById,
  useCurrentVoiceChannelId
} from '@/features/server/channels/hooks';
import { useChannelCan, useServerName } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  PhoneXMarkIcon,
  SignalSlashIcon,
  TvIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { ChannelPermission, getTrpcError, PluginSlot } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { StatsPopover } from './stats-popover';

const activeActionClass =
  'border-transparent bg-success-solid text-white hover:bg-success-solid/90 hover:text-white';

const inactiveActionClass =
  'border-transparent bg-raised text-foreground hover:bg-panel';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const { devices } = useDevices();
  const voiceChannelId = useCurrentVoiceChannelId();
  const channel = useChannelById(voiceChannelId ?? -1);
  const serverName = useServerName();
  const channelCan = useChannelCan(voiceChannelId);
  const {
    ownVoiceState,
    toggleWebcam,
    toggleScreenShare,
    setVoiceOnlyMode,
    connectionStatus,
    isScreenShareSupported
  } = useVoice();

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <ArrowPathIcon className="size-4 animate-spin" />,
          text: t('voiceConnecting'),
          color: 'text-yellow-500'
        };
      case 'connected':
        return {
          icon: <WifiIcon className="size-4" />,
          text: t('voiceConnected'),
          color: 'text-success'
        };
      case 'failed':
        return {
          icon: <ExclamationTriangleIcon className="size-4" />,
          text: t('voiceFailed'),
          color: 'text-red-400'
        };
      case 'disconnected':
      default:
        return {
          icon: <SignalSlashIcon className="size-4" />,
          text: t('voiceDisconnected'),
          color: 'text-red-400'
        };
    }
  }, [connectionStatus, t]);

  const [isVoiceOnlyModePending, setIsVoiceOnlyModePending] = useState(false);
  const isVoiceOnlyModeTogglePendingRef = useRef(false);

  const toggleVoiceOnlyMode = useCallback(async () => {
    if (isVoiceOnlyModeTogglePendingRef.current) return;

    isVoiceOnlyModeTogglePendingRef.current = true;
    setIsVoiceOnlyModePending(true);

    try {
      await setVoiceOnlyMode(!devices.voiceOnlyMode);
    } catch (error) {
      toast.error(getTrpcError(error, t('settings:failedSaveDeviceSettings')));
    } finally {
      isVoiceOnlyModeTogglePendingRef.current = false;
      setIsVoiceOnlyModePending(false);
    }
  }, [devices.voiceOnlyMode, setVoiceOnlyMode, t]);

  const handleDisconnect = useCallback(() => {
    leaveVoice({ reason: 'user_disconnect_button' });
  }, []);

  const pluginSlotProps = useMemo(
    () => (voiceChannelId ? { channelId: voiceChannelId } : undefined),
    [voiceChannelId]
  );

  if (!voiceChannelId) {
    return null;
  }

  const isWebcamActive = ownVoiceState.webcamEnabled;
  const isScreenShareActive = ownVoiceState.sharingScreen;
  const isVoiceOnlyModeActive = devices.voiceOnlyMode;

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div className="flex h-[76px] w-full shrink-0 flex-col bg-canvas">
        <div className="flex h-11 w-full shrink-0 items-center gap-1.5 bg-canvas px-2.5 py-1">
          <StatsPopover>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-6 shrink-0 rounded-[6px] p-0 hover:bg-raised',
                connectionInfo.color
              )}
              title={t('transportStats')}
              aria-label={t('transportStats')}
            >
              {connectionInfo.icon}
            </Button>
          </StatsPopover>
          <div className="flex h-8 min-w-0 flex-1 flex-col justify-center gap-px overflow-hidden">
            <span
              className={cn(
                'truncate text-xs font-semibold leading-[17px]',
                connectionInfo.color
              )}
            >
              {connectionInfo.text}
            </span>
            <span className="truncate text-[10px] leading-[14px] text-muted-foreground">
              {channel?.name} / {serverName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-[22px] shrink-0 rounded p-0 text-muted-foreground hover:bg-raised hover:text-foreground"
            onClick={handleDisconnect}
            title={t('disconnectVoice')}
          >
            <PhoneXMarkIcon className="size-[18px]" />
          </Button>
        </div>

        <div className="flex h-8 w-full shrink-0 items-center gap-[5px] bg-canvas px-2.5 pt-[3px] pb-[5px]">
          <PluginSlotRenderer
            slotId={PluginSlot.VOICE_CONTROLS}
            props={pluginSlotProps}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 min-w-0 flex-1 rounded-[6px] border p-0',
              isWebcamActive ? activeActionClass : inactiveActionClass
            )}
            onClick={toggleWebcam}
            title={isWebcamActive ? t('turnOffCamera') : t('turnOnCamera')}
            disabled={
              devices.voiceOnlyMode || !channelCan(ChannelPermission.WEBCAM)
            }
          >
            {isWebcamActive ? (
              <VideoCameraIcon className="size-[18px]" />
            ) : (
              <VideoCameraSlashIcon className="size-[18px]" />
            )}
          </Button>

          {isScreenShareSupported && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 min-w-0 flex-1 rounded-[6px] border p-0',
                isScreenShareActive ? activeActionClass : inactiveActionClass
              )}
              onClick={toggleScreenShare}
              title={
                isScreenShareActive
                  ? t('stopScreenShare')
                  : t('startScreenShare')
              }
              disabled={
                devices.voiceOnlyMode ||
                !channelCan(ChannelPermission.SHARE_SCREEN)
              }
            >
              <TvIcon className="size-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 min-w-0 flex-1 rounded-[6px] border p-0',
              isVoiceOnlyModeActive ? activeActionClass : inactiveActionClass
            )}
            onClick={toggleVoiceOnlyMode}
            title={t('settings:voiceOnlyModeDesc')}
            aria-label={t('settings:voiceOnlyModeLabel')}
            aria-pressed={isVoiceOnlyModeActive}
            disabled={isVoiceOnlyModePending}
          >
            {isVoiceOnlyModeActive ? (
              <EyeSlashIcon className="size-5" />
            ) : (
              <EyeIcon className="size-5" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
