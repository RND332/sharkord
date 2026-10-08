import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { UserAvatar } from '@/components/user-avatar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { usePinnedCard } from '@/features/server/voice/hooks';
import type { TRemoteStreams } from '@/types';
import { IconButton } from '@sharkord/ui';
import { ArrowDownLeft, SendToBack, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardControls } from '../channel-view/voice/card-controls';
import { HideWebcamButton } from '../channel-view/voice/hide-webcam-button';
import { PinnedCardType } from '../channel-view/voice/hooks/use-pin-card-controller';
import { ViewDemoButton } from '../channel-view/voice/view-demo-button';
import { useDemoVisibility } from './demo-visibility-context';
import { useFloatingCard } from './hooks/use-floating-card';
import type { TExternalStreamsMap } from './hooks/use-remote-streams';
import { useRemoteWebcamVisibility } from './remote-webcam-visibility-context';

type TFloatingPinnedCardProps = {
  remoteUserStreams: TRemoteStreams;
  externalStreams: TExternalStreamsMap;
  localVideoStream: MediaStream | undefined;
  localScreenShareStream: MediaStream | undefined;
};

const FloatingPinnedCard = memo(
  ({
    remoteUserStreams,
    externalStreams,
    localVideoStream,
    localScreenShareStream
  }: TFloatingPinnedCardProps) => {
    const { cardRef, handleMouseDown, getStyle, resetCard } = useFloatingCard();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(true);
    const pinnedCard = usePinnedCard();
    const ownUserId = useOwnUserId();
    const { devices } = useDevices();
    const { viewedRemoteDemos } = useDemoVisibility();
    const { isWebcamHidden } = useRemoteWebcamVisibility();
    const currentVoiceChannelSelected = useCurrentVoiceChannelId();
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const pinnedUser = useUserById(pinnedCard?.userId || -1);

    const pinnedCardVideoStream = useMemo(() => {
      if (!pinnedCard || devices.voiceOnlyMode) return undefined;

      if (pinnedCard.type === PinnedCardType.EXTERNAL_STREAM) {
        const externalStream = externalStreams[pinnedCard.userId];

        return externalStream?.videoStream;
      }

      const isScreenShare = pinnedCard.type === PinnedCardType.SCREEN_SHARE;

      if (
        isScreenShare &&
        pinnedCard.userId !== ownUserId &&
        !viewedRemoteDemos[pinnedCard.userId]
      ) {
        return undefined;
      }

      if (pinnedCard.userId === ownUserId) {
        return isScreenShare ? localScreenShareStream : localVideoStream;
      }

      const streamInfo = remoteUserStreams[pinnedCard.userId];

      return isScreenShare ? streamInfo?.screen : streamInfo?.video;
    }, [
      pinnedCard,
      remoteUserStreams,
      externalStreams,
      ownUserId,
      localVideoStream,
      localScreenShareStream,
      devices.voiceOnlyMode,
      viewedRemoteDemos
    ]);

    const onCloseClick = useCallback(() => {
      setOpen(false);
    }, []);

    const onGoToVoiceChannelClick = useCallback(() => {
      setSelectedChannelId(currentVoiceChannelSelected);
    }, [currentVoiceChannelSelected]);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = pinnedCardVideoStream ?? null;
      }
    }, [pinnedCardVideoStream, isCurrentVoiceChannelSelected]);

    useEffect(() => {
      setOpen(true);
    }, [pinnedCard?.id, isCurrentVoiceChannelSelected]);

    const webcamHiddenForPinnedUser =
      pinnedCard?.type === PinnedCardType.USER &&
      !!pinnedCard.userId &&
      isWebcamHidden(pinnedCard.userId);

    const showWebcamVideo =
      !!pinnedCardVideoStream && !webcamHiddenForPinnedUser;

    if (
      !pinnedCard ||
      isCurrentVoiceChannelSelected ||
      !open ||
      (pinnedCard.type === PinnedCardType.USER
        ? !pinnedUser
        : !pinnedCardVideoStream)
    ) {
      return null;
    }

    return (
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        className="absolute z-50 cursor-move select-none w-96 aspect-video rounded-lg overflow-hidden border border-border bg-black shadow-lg group flex items-center justify-center"
        style={getStyle()}
      >
        <CardControls>
          <IconButton
            icon={ArrowDownLeft}
            size="sm"
            variant="ghost"
            title="Go To Voice Channel"
            onClick={onGoToVoiceChannelClick}
          />
          <IconButton
            icon={SendToBack}
            size="sm"
            variant="ghost"
            title="Reset Position"
            onClick={resetCard}
          />
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            title="Close"
            onClick={onCloseClick}
          />
          {pinnedCard.type === PinnedCardType.USER &&
            pinnedCard.userId !== ownUserId &&
            !devices.voiceOnlyMode &&
            pinnedCardVideoStream && (
              <HideWebcamButton userId={pinnedCard.userId} />
            )}
          {pinnedCard.type === PinnedCardType.SCREEN_SHARE &&
            pinnedCard.userId !== ownUserId && (
              <ViewDemoButton userId={pinnedCard.userId} />
            )}
        </CardControls>

        {pinnedUser && (
          <div className="absolute bottom-2 left-2 bg-black/50 rounded-md px-2 py-1 text-xs z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {pinnedUser.name}
          </div>
        )}

        {pinnedCardVideoStream && (
          <video
            ref={videoRef}
            hidden={!showWebcamVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}
        {!showWebcamVideo && pinnedUser && (
          <UserAvatar
            userId={pinnedUser.id}
            className="w-16 h-16 md:w-24 md:h-24"
            showStatusBadge={false}
          />
        )}
      </div>
    );
  }
);

FloatingPinnedCard.displayName = 'FloatingPinnedCard';

export { FloatingPinnedCard };
