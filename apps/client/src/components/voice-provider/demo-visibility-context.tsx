import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { voiceChannelStateSelector } from '@/features/server/voice/selectors';
import type { IRootState } from '@/features/store';
import { logVoiceError } from '@/helpers/browser-logger';
import { StreamKind } from '@sharkord/shared';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useSelector } from 'react-redux';
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

const DemoVisibilityProvider = memo(
  ({ children }: TDemoVisibilityProviderProps) => {
    const voice = useVoice();
    const {
      consumeRef,
      rtpCapabilitiesRef,
      isViewingDemoRef,
      clearViewedDemoRef,
      voiceOnlyModeRef,
      canConsumeScreen,
      startReceivingDemo,
      stopReceivingDemo,
      removeRemoteUserStream,
      removeExternalStreamTrack,
      removeExternalStream,
      clearRemoteUserStreamsForUser
    } = voice;
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const voiceChannelState = useSelector((state: IRootState) =>
      currentVoiceChannelId === undefined
        ? undefined
        : voiceChannelStateSelector(state, currentVoiceChannelId)
    );
    const previousVoiceChannelStateRef = useRef(voiceChannelState);
    const [viewedRemoteDemos, setViewedRemoteDemos] =
      useState<TViewedRemoteDemos>({});
    const viewedRemoteDemosRef = useRef<TViewedRemoteDemos>({});
    const isViewingDemo = useCallback(
      (userId: number) => !!viewedRemoteDemosRef.current[userId],
      []
    );
    isViewingDemoRef.current = isViewingDemo;

    const viewDemo = useCallback(
      async (userId: number) => {
        const rtps = rtpCapabilitiesRef.current;
        if (!rtps || voiceOnlyModeRef.current) return;
        const next = {
          ...viewedRemoteDemosRef.current,
          [userId]: true as const
        };
        viewedRemoteDemosRef.current = next;
        setViewedRemoteDemos(next);
        if (startReceivingDemo(userId)) return;

        // pause/resume keeps the existing SFU consumer and saves inbound bandwidth.
        // the transport checks the same opt-in guard after each asynchronous step.
        await consumeRef.current?.(userId, StreamKind.SCREEN, rtps);
        if (!canConsumeScreen(userId)) return;
        await consumeRef.current?.(userId, StreamKind.SCREEN_AUDIO, rtps);
      },
      [
        consumeRef,
        rtpCapabilitiesRef,
        voiceOnlyModeRef,
        canConsumeScreen,
        startReceivingDemo
      ]
    );

    const stopViewingDemo = useCallback(
      async (userId: number) => {
        const next = { ...viewedRemoteDemosRef.current };
        delete next[userId];
        viewedRemoteDemosRef.current = next;
        setViewedRemoteDemos(next);
        await stopReceivingDemo(userId);
      },
      [stopReceivingDemo]
    );

    const clearViewedDemos = useCallback(() => {
      const userIds = Object.keys(viewedRemoteDemosRef.current);
      viewedRemoteDemosRef.current = {};
      setViewedRemoteDemos({});
      for (const userId of userIds) {
        stopReceivingDemo(+userId).catch((error) => {
          logVoiceError('demo: clearing viewed media failed', error);
        });
      }
    }, [stopReceivingDemo]);

    const clearViewedDemo = useCallback(
      (userId: number) => {
        if (!viewedRemoteDemosRef.current[userId]) return;
        stopViewingDemo(userId).catch((error) => {
          logVoiceError('demo: stopping viewed media failed', error, {
            userId
          });
        });
      },
      [stopViewingDemo]
    );
    clearViewedDemoRef.current = clearViewedDemo;

    // keep the subscription stable while the opt-in ref changes independently.
    useVoiceEvents({
      consumeRef,
      isViewingDemo,
      removeRemoteUserStream,
      removeExternalStreamTrack,
      removeExternalStream,
      clearRemoteUserStreamsForUser,
      clearViewedDemo,
      rtpCapabilitiesRef,
      isVoiceSessionActive:
        voice.connectionStatus === 'connecting' ||
        voice.connectionStatus === 'connected'
    });

    // reset session-scoped demo choices only when leaving voice, not text channels.
    useEffect(() => {
      if (currentVoiceChannelId !== undefined) return;
      clearViewedDemos();
    }, [currentVoiceChannelId, clearViewedDemos]);

    // state also covers a direct share stopped while its SFU fallback was pending.
    useEffect(() => {
      const previousState = previousVoiceChannelStateRef.current;
      previousVoiceChannelStateRef.current = voiceChannelState;
      if (currentVoiceChannelId === undefined) return;
      for (const userId of Object.keys(viewedRemoteDemosRef.current)) {
        const previousPresenter = previousState?.users[+userId];
        const presenter = voiceChannelState?.users[+userId];
        if (
          (previousPresenter?.sharingScreen && !presenter?.sharingScreen) ||
          (previousPresenter && !presenter)
        ) {
          clearViewedDemo(+userId);
        }
      }
    }, [currentVoiceChannelId, voiceChannelState, clearViewedDemo]);

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
