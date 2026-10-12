import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import {
  useChannelById,
  useCurrentVoiceChannelId
} from '@/features/server/channels/hooks';
import { useChannelCan, useServerName } from '@/features/server/hooks';
import { leaveVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ChannelPermission, getTrpcError, PluginSlot } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ExternalAudioStreams } from '../channel-view/voice/external-audio-streams';
import { VoiceAudioStreams } from '../channel-view/voice/voice-audio-streams';
import { PluginSlotRenderer } from '../plugin-slot-renderer';

const VoiceControl = memo(() => {
  const { t } = useTranslation('sidebar');
  const { devices, saveDevices } = useDevices();
  const voiceChannelId = useCurrentVoiceChannelId();
  const channel = useChannelById(voiceChannelId ?? -1);
  const serverName = useServerName();
  const channelCan = useChannelCan(voiceChannelId);
  const {
    ownVoiceState,
    toggleWebcam,
    toggleScreenShare,
    connectionStatus,
    isScreenShareSupported
  } = useVoice();

  const connectionInfo = useMemo(() => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="size-4 animate-spin" />,
          text: t('voiceConnecting'),
          color: 'text-yellow-500',
          iconBackground: 'bg-yellow-500/15'
        };
      case 'connected':
        return {
          icon: <Wifi className="size-4" />,
          text: t('voiceConnected'),
          color: 'text-success',
          iconBackground: 'bg-success/15'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="size-4" />,
          text: t('voiceFailed'),
          color: 'text-red-400',
          iconBackground: 'bg-red-500/15'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="size-4" />,
          text: t('voiceDisconnected'),
          color: 'text-red-400',
          iconBackground: 'bg-red-500/15'
        };
    }
  }, [connectionStatus, t]);

  const [isVoiceOnlyModePending, setIsVoiceOnlyModePending] = useState(false);
  const isVoiceOnlyModeTogglePendingRef = useRef(false);

  const toggleVoiceOnlyMode = useCallback(async () => {
    if (isVoiceOnlyModeTogglePendingRef.current) return;

    isVoiceOnlyModeTogglePendingRef.current = true;
    setIsVoiceOnlyModePending(true);
    const voiceOnlyMode = !devices.voiceOnlyMode;

    try {
      if (voiceChannelId !== undefined) {
        await getTRPCClient().voice.updateState.mutate({ voiceOnlyMode });
      }

      saveDevices({ ...devices, voiceOnlyMode });
    } catch (error) {
      toast.error(getTrpcError(error, t('settings:failedSaveDeviceSettings')));
    } finally {
      isVoiceOnlyModeTogglePendingRef.current = false;
      setIsVoiceOnlyModePending(false);
    }
  }, [devices, saveDevices, t, voiceChannelId]);

  const openVoiceDiagnostics = useCallback(() => {
    openDialog(Dialog.VOICE_DEBUG);
  }, []);

  const pluginSlotProps = useMemo(
    () => (voiceChannelId ? { channelId: voiceChannelId } : undefined),
    [voiceChannelId]
  );

  if (!voiceChannelId) {
    return null;
  }

  return (
    <>
      <VoiceAudioStreams channelId={voiceChannelId} />
      <ExternalAudioStreams channelId={voiceChannelId} />
      <div className="h-[78px] shrink-0 overflow-hidden bg-panel">
        <div className="flex h-[46px] items-center justify-between gap-1.5 px-2.5 py-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-md p-0 hover:bg-transparent',
              connectionInfo.color,
              connectionInfo.iconBackground
            )}
            onClick={openVoiceDiagnostics}
            title={t('voiceDiagnostics')}
            aria-label={t('voiceDiagnostics')}
          >
            {connectionInfo.icon}
          </Button>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-px">
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
            className="h-7 w-[22px] shrink-0 rounded text-muted-foreground hover:bg-raised hover:text-foreground"
            onClick={() => leaveVoice({ reason: 'user_disconnect_button' })}
            title={t('disconnectVoice')}
          >
            <PhoneOff className="size-[18px]" />
          </Button>
        </div>

        <div className="flex h-8 items-center gap-1.25 px-2.5 pb-1.25 pt-0.75">
          <PluginSlotRenderer
            slotId={PluginSlot.VOICE_CONTROLS}
            props={pluginSlotProps}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 min-w-0 flex-1 rounded-md bg-raised text-foreground hover:bg-raised/80',
              ownVoiceState.webcamEnabled && 'text-success'
            )}
            onClick={toggleWebcam}
            title={
              ownVoiceState.webcamEnabled
                ? t('turnOffCamera')
                : t('turnOnCamera')
            }
            disabled={
              devices.voiceOnlyMode || !channelCan(ChannelPermission.WEBCAM)
            }
          >
            {ownVoiceState.webcamEnabled ? (
              <Video className="size-5" />
            ) : (
              <VideoOff className="size-5" />
            )}
          </Button>

          {isScreenShareSupported && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 min-w-0 flex-1 rounded-md bg-raised text-foreground hover:bg-raised/80',
                ownVoiceState.sharingScreen && 'text-success'
              )}
              onClick={toggleScreenShare}
              title={
                ownVoiceState.sharingScreen
                  ? t('stopScreenShare')
                  : t('startScreenShare')
              }
              disabled={
                devices.voiceOnlyMode ||
                !channelCan(ChannelPermission.SHARE_SCREEN)
              }
            >
              {ownVoiceState.sharingScreen ? (
                <Monitor className="size-5" />
              ) : (
                <MonitorOff className="size-5" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 min-w-0 flex-1 rounded-md bg-raised hover:bg-raised/80',
              devices.voiceOnlyMode
                ? 'text-success hover:!text-success'
                : 'text-foreground'
            )}
            onClick={toggleVoiceOnlyMode}
            title={t('settings:voiceOnlyModeDesc')}
            aria-label={t('settings:voiceOnlyModeLabel')}
            aria-pressed={devices.voiceOnlyMode}
            disabled={isVoiceOnlyModePending}
          >
            {devices.voiceOnlyMode ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
});

export { VoiceControl };
