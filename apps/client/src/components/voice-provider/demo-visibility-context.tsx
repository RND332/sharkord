import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { StreamKind } from '@sharkord/shared';
import type {
  AppData,
  Consumer,
  RtpCapabilities
} from 'mediasoup-client/types';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import { useVoiceEvents } from './hooks/use-voice-events';

type TViewedRemoteDemos = Record<number, true>;

type TDemoVisibilityContext = {
  viewedRemoteDemos: TViewedRemoteDemos;
  isViewingDemo: (userId: number) => boolean;
  viewDemo: (userId: number) => Promise<void>;
  stopViewingDemo: (userId: number) => Promise<void>;
  clearViewedDemos: () => void;
  clearViewedDemo: (userId: number) => void;
};

const DemoVisibilityContext = createContext<TDemoVisibilityContext | null>(
  null
);

type TDemoVisibilityProviderProps = {
  children: ReactNode;
};

// Pause/resume a screen-share consumer instead of closing+reopening it on
// every View toggle. This saves inbound bandwidth while the local viewer is
// not actively watching, and re-Viewing is instant.
const ensureConsumer = async (
  remoteId: number,
  kind: StreamKind.SCREEN | StreamKind.SCREEN_AUDIO,
  opts: {
    consume: (
      remoteId: number,
      kind: StreamKind,
      rtps: RtpCapabilities
    ) => Promise<void>;
    getConsumer: (
      remoteId: number,
      kind: StreamKind
    ) => Consumer<AppData> | undefined;
    pauseServer: (
      remoteId: number,
      kind: StreamKind.SCREEN | StreamKind.SCREEN_AUDIO
    ) => Promise<void>;
    resumeServer: (
      remoteId: number,
      kind: StreamKind.SCREEN | StreamKind.SCREEN_AUDIO
    ) => Promise<void>;
    rtps: RtpCapabilities;
  }
) => {
  const existing = opts.getConsumer(remoteId, kind);

  if (existing) {
    if (existing.paused) {
      try {
        await existing.resume();
      } catch (error) {
        logVoice('Failed to resume consumer locally', {
          remoteId,
          kind,
          error
        });
      }
      try {
        await opts.resumeServer(remoteId, kind);
      } catch (error) {
        logVoice('Failed to resume consumer on server', {
          remoteId,
          kind,
          error
        });
      }
    }

    return;
  }

  await opts.consume(remoteId, kind, opts.rtps);
};

const DemoVisibilityProvider = memo(
  ({ children }: TDemoVisibilityProviderProps) => {
    const voice = useVoice();
    const consumeRef = voice.consumeRef;
    const getConsumer = voice.getConsumer;
    const rtps = voice.rtpCapabilities;
    const {
      removeRemoteUserStream,
      removeExternalStreamTrack,
      removeExternalStream,
      clearRemoteUserStreamsForUser
    } = voice;
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    const [viewedRemoteDemos, setViewedRemoteDemos] =
      useState<TViewedRemoteDemos>({});

    const isViewingDemo = useCallback(
      (userId: number) => !!viewedRemoteDemos[userId],
      [viewedRemoteDemos]
    );

    const viewDemo = useCallback(
      async (userId: number) => {
        if (!rtps) {
          logVoice('Cannot view demo — rtpCapabilities not yet available');
          return;
        }

        setViewedRemoteDemos((prev) =>
          prev[userId] ? prev : { ...prev, [userId]: true }
        );

        const trpc = getTRPCClient();

        await ensureConsumer(userId, StreamKind.SCREEN, {
          consume: async (r, k, caps) => {
            await consumeRef.current?.(r, k, caps);
          },
          getConsumer: (r, k) => getConsumer(r, k),
          pauseServer: async (r, k) => {
            await trpc.voice.pauseConsumer.mutate({ remoteId: r, kind: k });
          },
          resumeServer: async (r, k) => {
            await trpc.voice.resumeConsumer.mutate({ remoteId: r, kind: k });
          },
          rtps
        });

        // SCREEN_AUDIO may not exist (user didn't tick "share tab audio").
        // Try to consume it; if the server says "no producer", swallow.
        try {
          await ensureConsumer(userId, StreamKind.SCREEN_AUDIO, {
            consume: async (r, k, caps) => {
              await consumeRef.current?.(r, k, caps);
            },
            getConsumer: (r, k) => getConsumer(r, k),
            pauseServer: async (r, k) => {
              await trpc.voice.pauseConsumer.mutate({ remoteId: r, kind: k });
            },
            resumeServer: async (r, k) => {
              await trpc.voice.resumeConsumer.mutate({ remoteId: r, kind: k });
            },
            rtps
          });
        } catch {
          // no screen-audio producer; ignore
        }
      },
      [consumeRef, getConsumer, rtps]
    );

    const stopViewingDemo = useCallback(
      async (userId: number) => {
        setViewedRemoteDemos((prev) => {
          if (!prev[userId]) return prev;

          const next = { ...prev };
          delete next[userId];

          return next;
        });

        const trpc = getTRPCClient();

        const pauseIfPresent = async (
          kind: StreamKind.SCREEN | StreamKind.SCREEN_AUDIO
        ) => {
          const consumer = getConsumer(userId, kind);

          if (!consumer) return;

          try {
            if (!consumer.paused) {
              await consumer.pause();
            }
          } catch (error) {
            logVoice('Failed to pause consumer locally', {
              userId,
              kind,
              error
            });
          }

          try {
            await trpc.voice.pauseConsumer.mutate({
              remoteId: userId,
              kind
            });
          } catch (error) {
            logVoice('Failed to pause consumer on server', {
              userId,
              kind,
              error
            });
          }
        };

        await pauseIfPresent(StreamKind.SCREEN);
        await pauseIfPresent(StreamKind.SCREEN_AUDIO);
      },
      [getConsumer]
    );

    const clearViewedDemos = useCallback(() => {
      setViewedRemoteDemos({});
    }, []);

    const clearViewedDemo = useCallback((userId: number) => {
      setViewedRemoteDemos((prev) => {
        if (!prev[userId]) return prev;

        const next = { ...prev };
        delete next[userId];

        return next;
      });
    }, []);

    // Subscribe to VOICE_NEW_PRODUCER / VOICE_PRODUCER_CLOSED / etc. here so
    // the gate on SCREEN / SCREEN_AUDIO can read `isViewingDemo`. The
    // effect early-returns until both `currentVoiceChannelId` and
    // `rtpCapabilities` are available.
    useVoiceEvents({
      consumeRef,
      isViewingDemo,
      removeRemoteUserStream,
      removeExternalStreamTrack,
      removeExternalStream,
      clearRemoteUserStreamsForUser,
      clearViewedDemo,
      rtpCapabilities: rtps
    });

    // Reset session-scoped demo state when the user leaves voice entirely.
    // Switching text channels while in voice should NOT reset — only leaving
    // voice (currentVoiceChannelId becomes undefined).
    useEffect(() => {
      if (currentVoiceChannelId !== undefined) return;
      setViewedRemoteDemos((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
    }, [currentVoiceChannelId]);

    return (
      <DemoVisibilityContext.Provider
        value={{
          viewedRemoteDemos,
          isViewingDemo,
          viewDemo,
          stopViewingDemo,
          clearViewedDemos,
          clearViewedDemo
        }}
      >
        {children}
      </DemoVisibilityContext.Provider>
    );
  }
);

const useDemoVisibility = () => {
  const context = useContext(DemoVisibilityContext);

  if (!context) {
    throw new Error(
      'useDemoVisibility must be used within DemoVisibilityProvider'
    );
  }

  return context;
};

export { DemoVisibilityContext, DemoVisibilityProvider, useDemoVisibility };
export type { TDemoVisibilityContext, TViewedRemoteDemos };
