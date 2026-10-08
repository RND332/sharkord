import { logVoice, logVoiceError } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@sharkord/shared';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { DirectScreenShare } from '../direct-screen-share';

type TScreenKind = StreamKind.SCREEN | StreamKind.SCREEN_AUDIO;

type TDirectScreenShareParams = {
  channelId: number | undefined;
  enabled: boolean;
  isVoiceSessionActive: boolean;
  canConsumeScreen: (userId: number) => boolean;
  clearViewedDemoRef: MutableRefObject<(userId: number) => void>;
  addRemoteUserStream: (
    userId: number,
    stream: MediaStream,
    kind: TScreenKind
  ) => void;
  removeRemoteUserStream: (
    userId: number,
    kind: TScreenKind,
    expectedStream?: MediaStream
  ) => void;
};

const useDirectScreenShare = ({
  channelId,
  enabled,
  isVoiceSessionActive,
  canConsumeScreen,
  clearViewedDemoRef,
  addRemoteUserStream,
  removeRemoteUserStream
}: TDirectScreenShareParams) => {
  const enabledRef = useRef(enabled);
  const sessionActiveRef = useRef(isVoiceSessionActive);
  sessionActiveRef.current = isVoiceSessionActive;
  enabledRef.current = enabled;
  const subscribed = useRef(false);
  const directScreenShare = useMemo(
    () =>
      new DirectScreenShare({
        canReceive: (userId) =>
          enabledRef.current &&
          sessionActiveRef.current &&
          canConsumeScreen(userId),
        canDefer: () => enabledRef.current && sessionActiveRef.current,
        onStopped: (userId) => clearViewedDemoRef.current(userId),
        prepare: async () => {
          if (!enabledRef.current || !subscribed.current) return null;
          const trpc = getTRPCClient();
          return trpc.voice.startDirectScreen.mutate({});
        },
        send: async (sessionId, signal) => {
          const trpc = getTRPCClient();
          await trpc.voice.signalDirectScreen.mutate({ sessionId, signal });
        },
        onStream: (userId, stream, kind) => {
          if (
            !enabledRef.current ||
            !sessionActiveRef.current ||
            !canConsumeScreen(userId)
          ) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          addRemoteUserStream(userId, stream, kind);
        },
        onRemoveStream: removeRemoteUserStream,
        onStatus: (status) =>
          logVoice('screen: direct path changed', { status }),
        onError: (error) => logVoiceError('screen: direct media failed', error)
      }),
    [
      addRemoteUserStream,
      removeRemoteUserStream,
      canConsumeScreen,
      clearViewedDemoRef
    ]
  );

  useEffect(() => {
    if (
      !channelId ||
      !enabled ||
      !isVoiceSessionActive ||
      typeof RTCPeerConnection === 'undefined'
    ) {
      return;
    }

    const trpc = getTRPCClient();
    let active = true;
    const subscription = trpc.voice.onDirectScreenSignal.subscribe(
      { enabled: true },
      {
        onStarted: () => {
          if (active) subscribed.current = true;
        },
        onData: (event) => {
          if (!active || !enabledRef.current || event.channelId !== channelId)
            return;
          directScreenShare.handleSignal(event).catch((error) => {
            logVoiceError('screen: direct signalling failed', error);
          });
        },
        onError: (error) => {
          subscribed.current = false;
          logVoiceError('screen: direct subscription failed', error);
        }
      }
    );

    return () => {
      active = false;
      subscribed.current = false;
      subscription.unsubscribe();
      directScreenShare.close();
    };
  }, [channelId, enabled, isVoiceSessionActive, directScreenShare]);

  return { directScreenShare };
};

export { useDirectScreenShare };
