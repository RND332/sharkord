import { useAudioLevel } from '@/components/channel-view/voice/hooks/use-audio-level';
import { VoiceProviderContext } from '@/components/voice-provider';
import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@sharkord/shared';
import { useContext, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
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
  useSelector((state: IRootState) =>
    voiceChannelExternalStreamsListSelector(state, channelId)
  );

export const useVoiceChannelAudioExternalStreams = (channelId: number) =>
  useSelector((state: IRootState) =>
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

export const useOwnVoiceState = () => useSelector(ownVoiceStateSelector);

export const usePinnedCard = () => useSelector(pinnedCardSelector);

export const useVoiceMoveTargetChannelId = () =>
  useSelector(voiceMoveTargetChannelIdSelector);

export const useVoiceReactions = (userId: number) =>
  useSelector((state: IRootState) => voiceReactionsSelector(state, userId));

export const useScreenViewers = (channelId: number) => {
  const demos = useSelector((state: IRootState) =>
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
  useSelector(hideNonVideoParticipantsSelector);

export const useShowUserBannersInVoice = () =>
  useSelector(showUserBannersInVoiceSelector);

export const useHideOwnScreenShare = () =>
  useSelector(hideOwnScreenShareSelector);

export const useSpeakingState = (userId: number) => {
  const { remoteUserStreams, localAudioStream } = useVoice();
  const isOwnUser = useIsOwnUser(userId);

  const audioStream = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteUserStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, userId, isOwnUser, localAudioStream]);

  const { micMuted } = useOwnVoiceState();
  const { isSpeaking, speakingEffectClass } = useAudioLevel(audioStream);

  const isOwnUserAndSpeaking = isOwnUser && isSpeaking && !micMuted;
  const isActivelySpeaking = isOwnUserAndSpeaking || (!isOwnUser && isSpeaking);

  return { isActivelySpeaking, speakingEffectClass };
};
