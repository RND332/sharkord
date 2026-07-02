import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import { StreamKind } from '@sharkord/shared';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { type MutableRefObject, useEffect } from 'react';

type TEvents = {
  consumeRef: MutableRefObject<
    | ((
        remoteId: number,
        kind: StreamKind,
        rtpCapabilities: RtpCapabilities
      ) => Promise<void>)
    | null
  >;
  isViewingDemo: (userId: number) => boolean;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStream: (streamId: number) => void;
  clearRemoteUserStreamsForUser: (userId: number) => void;
  clearViewedDemo: (userId: number) => void;
  rtpCapabilities: RtpCapabilities | undefined;
};

const useVoiceEvents = ({
  consumeRef,
  isViewingDemo,
  removeRemoteUserStream,
  removeExternalStreamTrack,
  removeExternalStream,
  clearRemoteUserStreamsForUser,
  clearViewedDemo,
  rtpCapabilities
}: TEvents) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();

  useEffect(() => {
    if (!currentVoiceChannelId || !rtpCapabilities) {
      logVoice('Voice events not initialized - missing channelId or rtps');
      return;
    }

    const trpc = getTRPCClient();

    let isCleaningUp = false;

    const onVoiceNewProducerSub = trpc.voice.onNewProducer.subscribe(
      undefined,
      {
        onData: ({ remoteId, kind, channelId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          if (remoteId === ownUserId) {
            logVoice('Ignoring own producer event', {
              remoteId,
              ownUserId,
              kind,
              channelId
            });

            return;
          }

          logVoice('New producer event received', {
            remoteId,
            kind,
            channelId
          });

          // Demos are opt-in. If this is a SCREEN / SCREEN_AUDIO producer and
          // the local viewer is not currently viewing this user's demo, do
          // not consume. The viewer must click "View demo" to start.
          if (
            (kind === StreamKind.SCREEN || kind === StreamKind.SCREEN_AUDIO) &&
            !isViewingDemo(remoteId)
          ) {
            logVoice('Skipping demo producer (not viewing)', {
              remoteId,
              kind,
              channelId
            });
            return;
          }

          try {
            consumeRef.current?.(remoteId, kind, rtpCapabilities);
          } catch (error) {
            logVoice('Error consuming new producer', {
              error,
              remoteId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceNewProducer subscription error', { error });
        }
      }
    );

    const onVoiceProducerClosedSub = trpc.voice.onProducerClosed.subscribe(
      undefined,
      {
        onData: ({ channelId, remoteId, kind }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('Producer closed event received', {
            remoteId,
            kind,
            channelId
          });

          try {
            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStreamTrack(remoteId, kind);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }

            // If the demo's SCREEN / SCREEN_AUDIO producer just closed,
            // forget that the viewer was viewing it — they will need to
            // explicitly click View again if the presenter re-shares.
            if (
              kind === StreamKind.SCREEN ||
              kind === StreamKind.SCREEN_AUDIO
            ) {
              clearViewedDemo(remoteId);
            }
          } catch (error) {
            logVoice('Error removing remote stream for closed producer', {
              error,
              remoteId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceProducerClosed subscription error', { error });
        }
      }
    );

    const onVoiceUserLeaveSub = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (currentVoiceChannelId !== channelId || isCleaningUp) return;

        logVoice('User leave event received', { userId, channelId });

        try {
          clearRemoteUserStreamsForUser(userId);
          clearViewedDemo(userId);
        } catch (error) {
          logVoice('Error clearing remote streams for user', { error });
        }
      },
      onError: (error) => {
        logVoice('onVoiceUserLeave subscription error', { error });
      }
    });

    const onVoiceRemoveExternalStreamSub =
      trpc.voice.onRemoveExternalStream.subscribe(undefined, {
        onData: ({ channelId, streamId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('External stream removed event received', {
            streamId,
            channelId
          });

          try {
            removeExternalStream(streamId);
          } catch (error) {
            logVoice('Error removing external stream', {
              error,
              streamId,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceRemoveExternalStream subscription error', { error });
        }
      });

    return () => {
      logVoice('Cleaning up voice events');

      isCleaningUp = true;

      onVoiceNewProducerSub.unsubscribe();
      onVoiceProducerClosedSub.unsubscribe();
      onVoiceUserLeaveSub.unsubscribe();
      onVoiceRemoveExternalStreamSub.unsubscribe();
    };
  }, [
    currentVoiceChannelId,
    ownUserId,
    consumeRef,
    isViewingDemo,
    removeRemoteUserStream,
    removeExternalStreamTrack,
    removeExternalStream,
    clearRemoteUserStreamsForUser,
    clearViewedDemo,
    rtpCapabilities
  ]);
};

export { useVoiceEvents };
