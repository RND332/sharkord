import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { UserAvatar } from '@/components/user-avatar';
import { useStreamVolumeControl } from '@/components/voice-provider/hooks/use-stream-volume-control';
import { useRemoteWebcamVisibility } from '@/components/voice-provider/remote-webcam-visibility-context';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import type { TVoiceUser } from '@/features/server/types';
import { useIsOwnUser } from '@/features/server/users/hooks';
import {
  useShowUserBannersInVoice,
  useSpeakingState,
  useVoice
} from '@/features/server/voice/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import { PluginSlot, StreamKind } from '@sharkord/shared';
import { HeadphoneOff, MicOff, Monitor, Video } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { CardTheme } from './card-theme';
import {
  cardBadgeClass,
  cardControlClass,
  cardControlsClass,
  cardDensity
} from './helpers';
import { HideWebcamButton } from './hide-webcam-button';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { ViewDemoButton } from './view-demo-button';
import { VoiceReactions } from './voice-reactions';
import { VolumeButton } from './volume-button';

type TVoiceUserCardProps = {
  userId: number;
  channelId: number;
  cardId: string;
  onPin: (card: TPinnedCard) => void;
  onUnpin: () => void;
  showPinControls?: boolean;
  voiceUser: TVoiceUser;
  className?: string;
  isPinned?: boolean;
  isAnyCardPinned?: boolean;
};

const VoiceUserCard = memo(
  ({
    userId,
    channelId,
    cardId,
    onPin,
    onUnpin,
    className,
    isPinned = false,
    showPinControls = true,
    voiceUser,
    isAnyCardPinned = false
  }: TVoiceUserCardProps) => {
    const { videoRef, hasVideoStream } = useVoiceRefs(userId);
    const { volumeKey } = useStreamVolumeControl({ type: 'user', userId });
    const { devices } = useDevices();
    const isOwnUser = useIsOwnUser(userId);
    const showUserBanners = useShowUserBannersInVoice();
    const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
    const { isSimulcastConsumer } = useVoice();
    const { isActivelySpeaking, speakingEffectClass } =
      useSpeakingState(userId);
    const { isWebcamHidden } = useRemoteWebcamVisibility();
    const webcamHidden = isWebcamHidden(userId);

    const isCompact = isAnyCardPinned && !isPinned;
    const density = cardDensity(isCompact);
    const showWebcamVideo =
      !devices.voiceOnlyMode && hasVideoStream && !webcamHidden;
    const showQualityControl =
      !isOwnUser && webRtcSimulcastEnabled && showWebcamVideo;

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
      } else {
        onPin({ id: cardId, type: PinnedCardType.USER, userId: userId });
      }
    }, [isPinned, onPin, onUnpin, cardId, userId]);

    const pluginSlotProps = useMemo(
      () => ({ channelId, userId }),
      [channelId, userId]
    );

    const backgroundStyle = useMemo(
      () =>
        showWebcamVideo
          ? { backgroundColor: '#000000' }
          : { backgroundImage: `url("${getFileUrl(voiceUser.banner)}")` },
      [showWebcamVideo, voiceUser.banner]
    );

    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[12px] bg-panel group/voice-user-card',
          'flex items-center justify-center',
          'size-full',
          'border border-line',
          isActivelySpeaking && speakingEffectClass,
          className
        )}
      >
        {voiceUser.banner && showUserBanners ? (
          <div
            className="absolute inset-0 h-full w-full rounded-[12px] bg-cover bg-center bg-no-repeat blur-sm brightness-50"
            style={backgroundStyle}
          />
        ) : (
          <CardTheme
            profileColor={voiceUser.profileColor}
            hasVideoStream={showWebcamVideo}
          />
        )}

        {!devices.voiceOnlyMode && hasVideoStream && (
          <video
            ref={videoRef}
            hidden={!showWebcamVideo}
            autoPlay
            muted
            playsInline
            className={cn(
              'absolute inset-0 w-full h-full object-contain',
              isOwnUser && devices.mirrorOwnVideo && '-scale-x-100'
            )}
          />
        )}
        {!showWebcamVideo && (
          <UserAvatar
            userId={userId}
            className={cn(
              'pointer-events-none [&_[data-slot=avatar-fallback]]:font-semibold',
              isPinned
                ? 'size-32 [&_[data-slot=avatar-fallback]]:text-4xl'
                : isCompact
                  ? 'size-16 [&_[data-slot=avatar-fallback]]:text-xl'
                  : 'size-30 [&_[data-slot=avatar-fallback]]:text-4xl'
            )}
            showStatusBadge={false}
          />
        )}

        <VoiceReactions userId={userId} isCompact={isCompact} />

        <div
          className={cn(
            'absolute top-0 left-0 z-10 flex items-center gap-1',
            density.inset
          )}
        >
          <PluginSlotRenderer
            slotId={PluginSlot.VOICE_USER_CARD}
            props={pluginSlotProps}
          />
        </div>

        <div
          className={cn(
            'absolute top-0 right-0 z-10 justify-end',
            density.inset,
            'flex opacity-0 pointer-events-none group-hover/voice-user-card:opacity-100 group-hover/voice-user-card:pointer-events-auto group-focus-within/voice-user-card:opacity-100 group-focus-within/voice-user-card:pointer-events-auto',
            'has-[[data-state=open]]:opacity-100 has-[[data-state=open]]:pointer-events-auto'
          )}
        >
          <div className={cardControlsClass(isCompact)}>
            {!isOwnUser && (
              <VolumeButton
                volumeKey={volumeKey}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {showQualityControl && (
              <QualityButton
                streamId={userId}
                kind={StreamKind.VIDEO}
                disabled={!isSimulcastConsumer(userId, StreamKind.VIDEO)}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {showWebcamVideo && (
              <PictureInPictureButton
                videoRef={videoRef}
                size={density.icon}
                className={cardControlClass()}
              />
            )}
            {showPinControls && (
              <PinButton
                isPinned={isPinned}
                handlePinToggle={handlePinToggle}
                size={density.icon}
                className={cardControlClass(isPinned)}
              />
            )}
            {!isOwnUser && !devices.voiceOnlyMode && hasVideoStream && (
              <HideWebcamButton
                userId={userId}
                size={density.icon}
                className={cardControlClass(webcamHidden)}
              />
            )}
            {!isOwnUser &&
              !devices.voiceOnlyMode &&
              voiceUser.state.sharingScreen && (
                <ViewDemoButton
                  userId={userId}
                  size={density.icon}
                  className={cardControlClass()}
                />
              )}
          </div>
        </div>

        <div
          className={cn('absolute bottom-0 left-0 right-0 flex', density.inset)}
        >
          <div className={cardBadgeClass(isCompact)}>
            {voiceUser.state.micMuted && !voiceUser.state.soundMuted && (
              <MicOff
                className="text-red-400/80 shrink-0 size-3"
                fill="currentColor"
              />
            )}
            {voiceUser.state.soundMuted && (
              <HeadphoneOff
                className="text-red-400/80 size-3"
                fill="currentColor"
              />
            )}
            {voiceUser.state.webcamEnabled && (
              <Video className="text-white/80 size-3" fill="currentColor" />
            )}
            {voiceUser.state.sharingScreen && (
              <Monitor className="text-white/80 size-3" />
            )}
            <p className={cn('truncate', density.label)}>{voiceUser.name}</p>
          </div>
        </div>
      </div>
    );
  }
);

VoiceUserCard.displayName = 'VoiceUserCard';

export { VoiceUserCard };
