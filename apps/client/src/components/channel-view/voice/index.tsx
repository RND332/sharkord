import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { useDemoVisibility } from '@/components/voice-provider/demo-visibility-context';
import { useVoiceUsersByChannelId } from '@/features/server/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import {
  useHideNonVideoParticipants,
  useHideOwnScreenShare,
  useVoiceChannelExternalStreamsList
} from '@/features/server/voice/hooks';
import { memo, useMemo } from 'react';
import { ControlsBar } from './controls-bar';
import { ExternalStreamCard } from './external-stream-card';
import { usePinCardController } from './hooks/use-pin-card-controller';
import { ScreenShareCard } from './screen-share-card';
import { VoiceGrid } from './voice-grid';
import { VoiceUserCard } from './voice-user-card';

type TChannelProps = {
  channelId: number;
};

const VoiceChannel = memo(({ channelId }: TChannelProps) => {
  const voiceUsers = useVoiceUsersByChannelId(channelId);
  const externalStreams = useVoiceChannelExternalStreamsList(channelId);
  const { pinnedCard, pinCard, unpinCard, isPinned } = usePinCardController();
  const hideNonVideoParticipants = useHideNonVideoParticipants();
  const hideOwnScreenShare = useHideOwnScreenShare();
  const ownUserId = useOwnUserId();
  const { viewedRemoteDemos } = useDemoVisibility();
  const { devices } = useDevices();
  const isAnyCardPinned = pinnedCard !== undefined;

  const cards = useMemo(() => {
    const cards: React.ReactNode[] = [];

    // Check if there are any video streams at all
    const hasAnyVideoStreams =
      !devices.voiceOnlyMode &&
      (voiceUsers.some(
        (user) => user.state.webcamEnabled || user.state.sharingScreen
      ) ||
        externalStreams.some((stream) => stream.tracks.video));

    // Only apply the filter if there are some video streams
    const shouldFilterNonVideo = hideNonVideoParticipants && hasAnyVideoStreams;

    voiceUsers.forEach((voiceUser) => {
      const userCardId = `user-${voiceUser.id}`;
      const hasVideo = voiceUser.state.webcamEnabled;
      const needsDemoControl =
        voiceUser.id !== ownUserId &&
        voiceUser.state.sharingScreen &&
        !viewedRemoteDemos[voiceUser.id];

      // keep the opt-in control reachable until its screen share tile is shown
      if (!shouldFilterNonVideo || hasVideo || needsDemoControl) {
        cards.push(
          <VoiceUserCard
            key={userCardId}
            userId={voiceUser.id}
            isPinned={isPinned(userCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={userCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            voiceUser={voiceUser}
          />
        );
      }

      // remote shares require opt-in; your own preview does not.
      const shouldHideOwnScreenShare =
        hideOwnScreenShare && voiceUser.id === ownUserId;
      if (
        !devices.voiceOnlyMode &&
        voiceUser.state.sharingScreen &&
        !shouldHideOwnScreenShare &&
        (voiceUser.id === ownUserId || viewedRemoteDemos[voiceUser.id])
      ) {
        const screenShareCardId = `screen-share-${voiceUser.id}`;

        cards.push(
          <ScreenShareCard
            key={screenShareCardId}
            userId={voiceUser.id}
            isPinned={isPinned(screenShareCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={screenShareCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    externalStreams.forEach((stream) => {
      if (devices.voiceOnlyMode) return;

      const externalStreamCardId = `external-stream-${stream.streamId}`;
      const hasVideo = stream.tracks.video;

      // Only show external stream card if not filtering, or if it has video
      if (!shouldFilterNonVideo || hasVideo) {
        cards.push(
          <ExternalStreamCard
            key={externalStreamCardId}
            streamId={stream.streamId}
            stream={stream}
            isPinned={isPinned(externalStreamCardId)}
            isAnyCardPinned={isAnyCardPinned}
            cardId={externalStreamCardId}
            onPin={pinCard}
            onUnpin={unpinCard}
            showPinControls
          />
        );
      }
    });

    return cards;
  }, [
    voiceUsers,
    externalStreams,
    devices.voiceOnlyMode,
    isPinned,
    pinCard,
    unpinCard,
    hideNonVideoParticipants,
    hideOwnScreenShare,
    ownUserId,
    viewedRemoteDemos,
    isAnyCardPinned
  ]);

  if (voiceUsers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">
            No one in the voice channel
          </p>
          <p className="text-muted-foreground text-sm">
            Join the voice channel to start a meeting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/voice-stage relative flex size-full flex-col overflow-hidden bg-canvas">
      <VoiceGrid pinnedCardId={pinnedCard?.id}>{cards}</VoiceGrid>
      <ControlsBar channelId={channelId} />
    </div>
  );
});

export { VoiceChannel };
