import { useAudioLevel } from '@/components/channel-view/voice/hooks/use-audio-level';
import { VoiceProviderContext } from '@/components/voice-provider';
import { useStoreSelector, type IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@dodecagon/shared';
import { useContext, useEffect, useMemo } from 'react';
import { handleSubscriptionError } from '../subscription-error';
import { useIsOwnUser } from '../users/hooks';
import { setScreenViewers } from './actions';
import {
  hideNonVideoParticipantsSelector,
  hideOwnScreenShareSelector,
  ownVoiceStateSelector,
  pinnedCardSelector,
  screenViewersByChannelIdSelector,
  showUserBannersInVoiceSelector,
  voiceChannelAudioExternalStreamsSelector,
  voiceChannelExternalStreamsListSelector,
  voiceMoveTargetChannelIdSelector,
  voiceReactionsSelector
} from './selectors';

export const useVoiceChannelExternalStreamsList = (channelId: number) =>
  useStoreSelector((state: IRootState) =>
    voiceChannelExternalStreamsListSelector(state, channelId)
  );

export const useVoiceChannelAudioExternalStreams = (channelId: number) =>
  useStoreSelector((state: IRootState) =>
    voiceChannelAudioExternalStreamsSelector(state, channelId)
  );

export const useVoice = () => {
  const context = useContext(VoiceProviderContext);

  if (!context) {
    throw new Error(
      'useVoice must be used within a MediasoupProvider component'
    );
  }

  return context;
};

export const useOwnVoiceState = () => useStoreSelector(ownVoiceStateSelector);

export const usePinnedCard = () => useStoreSelector(pinnedCardSelector);

export const useVoiceMoveTargetChannelId = () =>
  useStoreSelector(voiceMoveTargetChannelIdSelector);

export const useVoiceReactions = (userId: number) =>
  useStoreSelector((state: IRootState) =>
    voiceReactionsSelector(state, userId)
  );

export const useScreenViewers = (channelId: number) => {
  const demos = useStoreSelector((state: IRootState) =>
    screenViewersByChannelIdSelector(state, channelId)
  );

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const trpc = getTRPCClient();
      subscription = trpc.voice.onScreenViewers.subscribe(
        { channelId },
        {
          onData: setScreenViewers,
          onError: handleSubscriptionError('onScreenViewers')
        }
      );
    } catch {
      // the viewer indicator is optional; losing it must not take down the call UI.
    }

    return () => subscription?.unsubscribe();
  }, [channelId]);

  return demos;
};

export const useHideNonVideoParticipants = () =>
  useStoreSelector(hideNonVideoParticipantsSelector);

export const useShowUserBannersInVoice = () =>
  useStoreSelector(showUserBannersInVoiceSelector);

export const useHideOwnScreenShare = () =>
  useStoreSelector(hideOwnScreenShareSelector);

export const useSpeakingState = (userId: number) => {
  const { remoteUserStreams, localAudioStream } = useVoice();
  const isOwnUser = useIsOwnUser(userId);

  const audioStream = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteUserStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, userId, isOwnUser, localAudioStream]);

  const { micMuted } = useOwnVoiceState();
  const { isSpeaking, intensity } = useAudioLevel(audioStream);

  const isOwnUserAndSpeaking = isOwnUser && isSpeaking && !micMuted;
  const isActivelySpeaking = isOwnUserAndSpeaking || (!isOwnUser && isSpeaking);

  return {
    isActivelySpeaking,
    speakingIntensity: isActivelySpeaking ? intensity : 0
  };
};
