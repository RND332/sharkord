import { logVoiceError } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@sharkord/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DirectScreenShare } from '../direct-screen-share';

type TScreenSharePath = 'idle' | 'connecting' | 'direct' | 'relayed';
type TScreenKind = StreamKind.SCREEN | StreamKind.SCREEN_AUDIO;

type TDirectScreenShareParams = {
  channelId: number | undefined;
  enabled: boolean;
  isVoiceSessionActive: boolean;
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
  addRemoteUserStream,
  removeRemoteUserStream
}: TDirectScreenShareParams) => {
  const [screenSharePath, setScreenSharePath] =
    useState<TScreenSharePath>('idle');
  const subscribed = useRef(false);
  const directScreenShare = useMemo(
    () =>
      new DirectScreenShare({
        prepare: async () => {
          if (!subscribed.current) return null;
          const trpc = getTRPCClient();
          return trpc.voice.startDirectScreen.mutate({});
        },
        send: async (sessionId, signal) => {
          const trpc = getTRPCClient();
          await trpc.voice.signalDirectScreen.mutate({ sessionId, signal });
        },
        onStream: addRemoteUserStream,
        onRemoveStream: removeRemoteUserStream,
        onStatus: setScreenSharePath,
        onError: (error) => logVoiceError('screen: direct media failed', error)
      }),
    [addRemoteUserStream, removeRemoteUserStream]
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
          if (!active || event.channelId !== channelId) return;
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

  return { directScreenShare, screenSharePath, setScreenSharePath };
};

export { useDirectScreenShare, type TScreenSharePath };
