import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import {
  useCurrentVoicePeers,
  useDirectMediaPolicy,
  useWebRtcSimulcastEnabled
} from '@/features/server/hooks';
import { SoundType } from '@/features/server/types';
import { updateOwnVoiceState } from '@/features/server/voice/actions';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import {
  clampMicrophoneDecibels,
  MICROPHONE_GATE_CLOSE_HOLD_MS,
  MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
} from '@/helpers/audio-gate';
import {
  createNoiseGateWorkletNode,
  getNoiseGateWorkletAvailabilitySnapshot,
  markNoiseGateWorkletUnavailable,
  postNoiseGateWorkletConfig
} from '@/helpers/audio-worklet/noise-gate-worklet';
import { createNsChain } from '@/helpers/audio-worklet/ns-worklet';
import { playSound } from '@/helpers/sounds';

import {
  logVoice,
  logVoiceError,
  logVoiceWarn
} from '@/helpers/browser-logger';
import {
  getRestrictOwnAudioSupport,
  getSuppressLocalAudioPlaybackSupport
} from '@/helpers/get-display-media-support';
import { getResWidthHeight } from '@/helpers/get-res-with-height';
import {
  getScreenShareCodecCandidates,
  getScreenShareContentHint,
  getScreenSharePreset,
  getScreenSharePresetSettings,
  ScreenSharePreset
} from '@/helpers/screen-share-presets';
import { registerVoiceDebugSource } from '@/helpers/voice-debug';
import { useScreenShareSupport } from '@/hooks/use-screen-share-support';
import { getTRPCClient } from '@/lib/trpc';
import { NoiseSuppression, type TStreamQuality } from '@/types';
import {
  DEFAULT_BITRATE,
  getErrorMessage,
  StreamKind,
  type ConsumerType,
  type TDirectMediaKind,
  type TStreamQualityLayer,
  type TVoiceUserState
} from '@sharkord/shared';
import { Device } from 'mediasoup-client';
import type {
  AppData,
  Consumer,
  ProducerOptions,
  RtpCapabilities,
  RtpCodecCapability
} from 'mediasoup-client/types';
import {
  createContext,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDevices } from '../devices-provider/hooks/use-devices';
import { closeAudioContext } from './close-audio-context';
import {
  clearVoiceControlsBridge,
  setVoiceControlsBridge
} from './controls-bridge';
import { DemoVisibilityProvider } from './demo-visibility-context';
import {
  getRemoteConsumerTypeKey,
  getScreenShareSimulcastEncodings,
  getSimulcastCodec,
  getSimulcastEncodings,
  getSimulcastQualityLayers,
  getStreamQualityStorageKey,
  loadStreamQualitiesFromStorage,
  normalizeStreamQuality,
  saveStreamQualitiesToStorage,
  type TRemoteConsumerTypes,
  type TRemoteQualityLayers,
  type TStreamQualitySettings
} from './helpers';
import { useDirectMedia } from './hooks/use-direct-media';
import { useLocalStreams } from './hooks/use-local-streams';
import { useRemoteStreams } from './hooks/use-remote-streams';
import { useTransportStats } from './hooks/use-transport-stats';
import { useTransports } from './hooks/use-transports';
import { useVoiceControls } from './hooks/use-voice-controls';
import { RemoteWebcamVisibilityProvider } from './remote-webcam-visibility-context';
import { VoiceSessionCancelledError } from './session-cancelled';
import { SIMULCAST_WEBCAM_MAX_BITRATE } from './statics';
import { VoiceStatsContext } from './stats-context';
import { VolumeControlProvider } from './volume-control-context';

type AudioVideoRefs = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  screenShareRef: React.RefObject<HTMLVideoElement | null>;
  screenShareAudioRef: React.RefObject<HTMLAudioElement | null>;
  externalAudioRef: React.RefObject<HTMLAudioElement | null>;
  externalVideoRef: React.RefObject<HTMLVideoElement | null>;
};

type TVideoProducerAppData = {
  kind: StreamKind;
  qualityLayers?: TStreamQualityLayer[];
};

type TRefsKey = number | `external:${number}`;

export type { AudioVideoRefs };

enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed'
}

type TVoiceSessionAttempt = {
  channelId: number;
  generation: number;
  status: 'initializing' | 'ready' | 'failed';
  client?: ReturnType<typeof getTRPCClient>;
  error?: unknown;
};

const MAX_VOICE_SESSION_RESYNCS = 2;

export type TVoiceProvider = {
  loading: boolean;
  connectionStatus: ConnectionStatus;
  audioVideoRefsMap: Map<TRefsKey, AudioVideoRefs>;
  ownVoiceState: TVoiceUserState;
  isScreenShareSupported: boolean;
  getOrCreateRefs: (remoteId: number, isExternal?: boolean) => AudioVideoRefs;
  getConsumerCodec: (remoteId: number, kind: StreamKind) => string | undefined;
  getConsumer: (
    remoteId: number,
    kind: StreamKind
  ) => Consumer<AppData> | undefined;
  consumeRef: MutableRefObject<
    | ((
        remoteId: number,
        kind: StreamKind,
        rtps: RtpCapabilities
      ) => Promise<void>)
    | null
  >;
  rtpCapabilities: RtpCapabilities | undefined;
  rtpCapabilitiesRef: MutableRefObject<RtpCapabilities | null>;
  isViewingDemoRef: MutableRefObject<(userId: number) => boolean>;
  onRemoteDemoStoppedRef: MutableRefObject<(userId: number) => void>;
  voiceOnlyModeRef: MutableRefObject<boolean>;
  closeRemoteUserProducer: (
    userId: number,
    kind: StreamKind,
    producerId: string
  ) => void;
  canConsumeScreen: (userId: number) => boolean;
  startReceivingDemo: (userId: number) => boolean;
  stopReceivingDemo: (userId: number) => Promise<void>;
  getStreamQuality: (remoteId: number, kind: StreamKind) => TStreamQuality;
  getStreamQualityLayers: (
    remoteId: number,
    kind: StreamKind
  ) => TStreamQualityLayer[];
  setStreamQuality: (
    remoteId: number,
    kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO,
    quality: TStreamQuality
  ) => Promise<void>;
  isSimulcastConsumer: (remoteId: number, kind: StreamKind) => boolean;
  init: (
    routerRtpCapabilities: RtpCapabilities,
    channelId: number
  ) => Promise<void>;
  setVoiceOnlyMode: (enabled: boolean) => Promise<boolean>;
} & Pick<
  ReturnType<typeof useLocalStreams>,
  | 'localAudioStream'
  | 'localVideoStream'
  | 'localScreenShareStream'
  | 'localScreenShareAudioStream'
> &
  Pick<
    ReturnType<typeof useRemoteStreams>,
    | 'remoteUserStreams'
    | 'externalStreams'
    | 'removeRemoteUserStream'
    | 'removeExternalStreamTrack'
    | 'removeExternalStream'
    | 'clearRemoteUserStreamsForUser'
  > &
  ReturnType<typeof useVoiceControls>;

const VoiceProviderContext = createContext<TVoiceProvider>({
  loading: false,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  audioVideoRefsMap: new Map(),
  isScreenShareSupported: false,
  getOrCreateRefs: () => ({
    videoRef: { current: null },
    audioRef: { current: null },
    screenShareRef: { current: null },
    screenShareAudioRef: { current: null },
    externalAudioRef: { current: null },
    externalVideoRef: { current: null }
  }),
  getConsumerCodec: () => undefined,
  getConsumer: () => undefined,
  consumeRef: { current: null },
  rtpCapabilities: undefined,
  rtpCapabilitiesRef: { current: null },
  isViewingDemoRef: { current: () => false },
  onRemoteDemoStoppedRef: { current: () => {} },
  voiceOnlyModeRef: { current: false },
  closeRemoteUserProducer: () => {},
  canConsumeScreen: () => false,
  startReceivingDemo: () => false,
  stopReceivingDemo: () => Promise.resolve(),
  getStreamQuality: () => ({ mode: 'auto' }),
  getStreamQualityLayers: () => [],
  setStreamQuality: () => Promise.resolve(),
  isSimulcastConsumer: () => false,
  init: () => Promise.resolve(),
  setVoiceOnlyMode: async () => false,
  toggleMic: () => Promise.resolve(),
  toggleSound: () => Promise.resolve(),
  toggleWebcam: () => Promise.resolve(),
  toggleScreenShare: () => Promise.resolve(),
  ownVoiceState: {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  },
  localAudioStream: undefined,
  localVideoStream: undefined,
  localScreenShareStream: undefined,
  localScreenShareAudioStream: undefined,

  remoteUserStreams: {},
  externalStreams: {},
  removeRemoteUserStream: () => {},
  removeExternalStreamTrack: () => {},
  removeExternalStream: () => {},
  clearRemoteUserStreamsForUser: () => {}
});

type TVoiceProviderProps = {
  children: React.ReactNode;
};

const VoiceProvider = memo(({ children }: TVoiceProviderProps) => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );
  const routerRtpCapabilities = useRef<RtpCapabilities | null>(null);
  const deviceRtpCapabilities = useRef<RtpCapabilities | null>(null);
  const audioVideoRefsMap = useRef<Map<TRefsKey, AudioVideoRefs>>(new Map());
  const previousVoiceChannelIdRef = useRef<number | undefined>(undefined);
  const [streamQualities, setStreamQualities] =
    useState<TStreamQualitySettings>(loadStreamQualitiesFromStorage);
  const [remoteConsumerTypes, setRemoteConsumerTypes] =
    useState<TRemoteConsumerTypes>({});
  const [remoteQualityLayers, setRemoteQualityLayers] =
    useState<TRemoteQualityLayers>({});
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const currentVoiceChannelIdRef = useRef(currentVoiceChannelId);
  currentVoiceChannelIdRef.current = currentVoiceChannelId;
  const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
  const directMediaPolicy = useDirectMediaPolicy();
  const directMediaPolicyRef = useRef(directMediaPolicy);
  directMediaPolicyRef.current = directMediaPolicy;
  const microphoneRouteRef = useRef<'direct' | 'relay' | undefined>(undefined);
  const webcamRouteRef = useRef<'direct' | 'relay' | undefined>(undefined);
  const [screenRoute, setScreenRoute] = useState<
    'direct' | 'relay' | undefined
  >();
  const screenRoutingRef = useRef<symbol | undefined>(undefined);
  const screenPublicationRef = useRef<symbol | undefined>(undefined);
  const republishScreenRef = useRef<() => Promise<void>>(async () => {});
  const ownVoiceState = useOwnVoiceState();
  const { devices, saveDevices } = useDevices();
  const voiceOnlyMode =
    !!devices.voiceOnlyMode || !!ownVoiceState.voiceOnlyMode;
  const voiceOnlyModeRef = useRef(voiceOnlyMode);
  voiceOnlyModeRef.current = voiceOnlyMode;
  const savedVoiceOnlyModeRef = useRef(devices.voiceOnlyMode);
  savedVoiceOnlyModeRef.current = devices.voiceOnlyMode;
  const previousVoiceOnlyModeRef = useRef(voiceOnlyMode);
  const isViewingDemoRef = useRef<(userId: number) => boolean>(() => false);
  const onRemoteDemoStoppedRef = useRef<(userId: number) => void>(() => {});
  const canConsumeScreen = useCallback(
    (userId: number) =>
      !!currentVoiceChannelIdRef.current &&
      !voiceOnlyModeRef.current &&
      !!deviceRtpCapabilities.current &&
      isViewingDemoRef.current(userId),
    []
  );
  const { isScreenShareSupported } = useScreenShareSupport();
  const { t } = useTranslation('common');

  const simulcastEnabled =
    !!webRtcSimulcastEnabled && !!devices.simulcastEnabled;

  // Simulcast for screen-share is split from the webcam setting because
  // 3-layer simulcast on a publisher's CPU can drop the encoded fps to ~1 on
  // integrated GPUs / under thermal pressure. Default `false` (see
  // devices-provider defaults); advanced users can opt back in.
  const screenShareSimulcastEnabled =
    !!webRtcSimulcastEnabled && !!devices.screenShareSimulcastEnabled;

  const getStreamQuality = useCallback(
    (remoteId: number, kind: StreamKind): TStreamQuality => {
      const storageKey = getStreamQualityStorageKey(remoteId, kind);
      const consumerKey = getRemoteConsumerTypeKey(remoteId, kind);
      const layers = remoteQualityLayers[consumerKey] ?? [];

      return normalizeStreamQuality(streamQualities[storageKey], layers);
    },
    [remoteQualityLayers, streamQualities]
  );

  const getStreamQualityLayers = useCallback(
    (remoteId: number, kind: StreamKind): TStreamQualityLayer[] => {
      const consumerKey = getRemoteConsumerTypeKey(remoteId, kind);

      return remoteQualityLayers[consumerKey] ?? [];
    },
    [remoteQualityLayers]
  );

  const setRemoteStreamQualityLayers = useCallback(
    (remoteId: number, kind: StreamKind, layers: TStreamQualityLayer[]) => {
      const key = getRemoteConsumerTypeKey(remoteId, kind);

      setRemoteQualityLayers((prev) => {
        if (layers.length === 0) {
          const next = { ...prev };

          delete next[key];

          return next;
        }

        return { ...prev, [key]: layers };
      });
    },
    []
  );

  const clearRemoteConsumerMetadata = useCallback(() => {
    setRemoteConsumerTypes({});
    setRemoteQualityLayers({});
  }, []);

  const shouldShowQualityPicker = useCallback(
    (remoteId: number, kind: StreamKind): boolean => {
      const key = getRemoteConsumerTypeKey(remoteId, kind);

      return (
        remoteConsumerTypes[key] === 'simulcast' &&
        (remoteQualityLayers[key]?.length ?? 0) > 0
      );
    },
    [remoteConsumerTypes, remoteQualityLayers]
  );

  const setRemoteConsumerType = useCallback(
    (
      remoteId: number,
      kind: StreamKind,
      consumerType: ConsumerType | undefined
    ) => {
      const key = getRemoteConsumerTypeKey(remoteId, kind);

      setRemoteConsumerTypes((prev) => {
        if (consumerType === undefined) {
          const next = { ...prev };

          delete next[key];

          return next;
        }

        return { ...prev, [key]: consumerType };
      });
    },
    []
  );

  const isSimulcastConsumer = useCallback(
    (remoteId: number, kind: StreamKind): boolean => {
      return shouldShowQualityPicker(remoteId, kind);
    },
    [shouldShowQualityPicker]
  );

  const setStreamQuality = useCallback(
    async (
      remoteId: number,
      kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO,
      quality: TStreamQuality
    ) => {
      setStreamQualities((prev) => {
        const next = {
          ...prev,
          [getStreamQualityStorageKey(remoteId, kind)]: quality
        };

        saveStreamQualitiesToStorage(next);

        return next;
      });

      if (!shouldShowQualityPicker(remoteId, kind)) return;

      const client = getTRPCClient();

      try {
        await client.voice.setConsumerQuality.mutate({
          remoteId,
          kind,
          quality
        });

        logVoice('consumer: quality changed', { remoteId, kind, quality });
      } catch (error) {
        logVoiceError('consumer: quality change failed', error, {
          remoteId,
          kind,
          quality
        });
      }
    },
    [shouldShowQualityPicker]
  );

  const getOrCreateRefs = useCallback(
    (remoteId: number, isExternal = false): AudioVideoRefs => {
      const key: TRefsKey = isExternal ? `external:${remoteId}` : remoteId;

      if (!audioVideoRefsMap.current.has(key)) {
        audioVideoRefsMap.current.set(key, {
          videoRef: { current: null },
          audioRef: { current: null },
          screenShareRef: { current: null },
          screenShareAudioRef: { current: null },
          externalAudioRef: { current: null },
          externalVideoRef: { current: null }
        });
      }

      return audioVideoRefsMap.current.get(key)!;
    },
    []
  );

  const {
    addExternalStreamTrack,
    removeExternalStreamTrack,
    removeExternalStream,
    clearExternalStreams,
    addRemoteUserStream,
    removeRemoteUserStream,
    clearRemoteUserStreamsForUser,
    clearRemoteUserStreams,
    externalStreams,
    remoteUserStreams
  } = useRemoteStreams();

  const {
    localAudioProducer,
    localVideoProducer,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    localScreenShareAudioStream,
    localScreenShareProducer,
    localScreenShareAudioProducer,
    setLocalAudioStream,
    setLocalVideoStream,
    setLocalScreenShare,
    setLocalScreenShareAudio,
    clearLocalStreams
  } = useLocalStreams();
  const capturedScreenStreamRef = useRef<MediaStream | undefined>(undefined);
  const screenShareGenerationRef = useRef(0);
  const capturedWebcamStreamRef = useRef<MediaStream | undefined>(undefined);
  const webcamGenerationRef = useRef(0);
  const restartWebcamStreamRef = useRef<() => Promise<void>>(async () => {});

  const {
    producerTransport,
    consumerTransport,
    sessionGenerationRef,
    consumers,
    createProducerTransport,
    createConsumerTransport,
    consumeRef,
    consumeExistingProducers,
    cleanupTransports,
    getConsumer,
    getConsumerCodec,
    pauseDemoConsumers,
    closeConsumer,
    closeConsumers
  } = useTransports({
    voiceOnlyMode,
    canConsumeScreen,
    addExternalStreamTrack,
    removeExternalStreamTrack,
    addRemoteUserStream,
    removeRemoteUserStream,
    setRemoteConsumerType,
    setRemoteStreamQualityLayers,
    clearRemoteConsumerMetadata
  });
  const voiceSessionAttemptRef = useRef<TVoiceSessionAttempt | undefined>(
    undefined
  );
  const voiceProviderLifetimeRef = useRef({ generation: 0, mounted: true });
  const voiceSessionListenersRef = useRef(new Set<() => void>());
  const notifyVoiceSessionListeners = useCallback(() => {
    voiceSessionListenersRef.current.forEach((listener) => listener());
  }, []);

  // Voice events get these resource-owning callbacks through the context.
  // Internal cleanup uses raw stream callbacks to avoid recursive invalidation.
  const removeRemoteUserStreamAndConsumer = useCallback(
    (userId: number, kind: Parameters<typeof removeRemoteUserStream>[1]) =>
      closeConsumer(userId, kind),
    [closeConsumer]
  );
  const closeRemoteUserProducer = useCallback(
    (userId: number, kind: StreamKind, producerId: string) =>
      closeConsumer(userId, kind, producerId),
    [closeConsumer]
  );
  const removeExternalStreamTrackAndConsumer = useCallback(
    (streamId: number, kind: Parameters<typeof removeExternalStreamTrack>[1]) =>
      closeConsumer(streamId, kind),
    [closeConsumer]
  );
  const clearRemoteUserStreamsAndConsumersForUser = useCallback(
    (userId: number) => {
      closeConsumers(userId, [
        StreamKind.AUDIO,
        StreamKind.VIDEO,
        StreamKind.SCREEN,
        StreamKind.SCREEN_AUDIO
      ]);
      clearRemoteUserStreamsForUser(userId);
    },
    [closeConsumers, clearRemoteUserStreamsForUser]
  );
  const removeExternalStreamAndConsumers = useCallback(
    (streamId: number) => {
      closeConsumers(streamId, [
        StreamKind.EXTERNAL_AUDIO,
        StreamKind.EXTERNAL_VIDEO
      ]);
      removeExternalStream(streamId);
    },
    [closeConsumers, removeExternalStream]
  );

  const { directMedia } = useDirectMedia({
    channelId: currentVoiceChannelId,
    enabled: !!devices.directScreenSharing,
    voiceOnlyMode,
    isVoiceSessionActive:
      connectionStatus === ConnectionStatus.CONNECTING ||
      connectionStatus === ConnectionStatus.CONNECTED,
    canConsumeScreen,
    onRemoteDemoStoppedRef,
    addRemoteUserStream,
    removeRemoteUserStream
  });

  const directScreenShare = directMedia[StreamKind.SCREEN];
  const directMicrophone = directMedia[StreamKind.AUDIO];
  const directWebcam = directMedia[StreamKind.VIDEO];

  const startReceivingDemo = useCallback(
    (userId: number) => directScreenShare.acceptPendingOffer(userId),
    [directScreenShare]
  );

  const stopReceivingDemo = useCallback(
    async (userId: number) => {
      directScreenShare.stopReceiving(userId);
      await pauseDemoConsumers(userId);
    },
    [directScreenShare, pauseDemoConsumers]
  );

  const {
    stats: transportStats,
    subscribe: subscribeToStats,
    startMonitoring,
    stopMonitoring,
    resetStats,
    setScreenShareProducer
  } = useTransportStats(Object.values(directMedia));
  const rawMicrophoneStreamRef = useRef<MediaStream | null>(null);
  const transmitMicrophoneTrackRef = useRef<MediaStreamTrack | null>(null);
  const microphoneNoiseGateAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneVolumeContextRef = useRef<AudioContext | null>(null);
  const microphoneGainRef = useRef<GainNode | null>(null);
  const microphoneVolumeRef = useRef(devices.microphoneVolume);
  const microphoneNoiseGateWorkletNodeRef = useRef<AudioWorkletNode | null>(
    null
  );
  const nsAudioContextsRef = useRef<AudioContext[]>([]);
  const pendingMicStartupDisposerRef = useRef<(() => void) | null>(null);
  const micRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const micRecoveryHistoryRef = useRef<number[]>([]);
  const startMicStreamRef = useRef<() => Promise<void>>(async () => {});
  const selectedMicrophoneIdRef = useRef(devices.microphoneId);
  const republishMicrophoneRef = useRef<() => Promise<void>>(async () => {});
  const micMutedRef = useRef(ownVoiceState.micMuted);
  const p2pFallbackKindsRef = useRef(new Set<TDirectMediaKind>());
  const currentVoicePeers = useCurrentVoicePeers();
  const currentVoicePeerIds = useMemo(
    () => currentVoicePeers.map((peer) => peer.id).join(','),
    [currentVoicePeers]
  );

  const shouldAttemptDirect = useCallback(
    (kind: TDirectMediaKind) => {
      if (!devices.directScreenSharing || p2pFallbackKindsRef.current.has(kind))
        return false;
      const policy = directMediaPolicyRef.current;
      if (kind === StreamKind.SCREEN) return policy === 'all';
      return policy !== 'relay';
    },
    [devices.directScreenSharing]
  );

  const markP2pFallback = useCallback((kind: TDirectMediaKind) => {
    p2pFallbackKindsRef.current.add(kind);
  }, []);

  const voiceIdentity = `${currentVoiceChannelId ?? ''}:${currentVoicePeerIds}`;
  // a new channel or participant changes who could be dialled, so a previous
  // failed attempt must not pin the room to relay for the rest of the session.
  const previousVoiceIdentityRef = useRef(voiceIdentity);
  if (previousVoiceIdentityRef.current !== voiceIdentity) {
    previousVoiceIdentityRef.current = voiceIdentity;
    p2pFallbackKindsRef.current.clear();
  }

  const syncTransmitMicrophoneTrackState = useCallback(() => {
    const track = transmitMicrophoneTrackRef.current;

    if (!track) return;

    const shouldEnable = !micMutedRef.current;

    if (track.enabled !== shouldEnable) {
      track.enabled = shouldEnable;
    }
  }, []);

  const cleanupMicProcessingResources = useCallback(() => {
    logVoice('mic: releasing capture resources');
    republishMicrophoneRef.current = async () => {};
    directMicrophone.stop();

    if (micRecoveryTimerRef.current !== null) {
      clearTimeout(micRecoveryTimerRef.current);
      micRecoveryTimerRef.current = null;
    }

    const disposePendingStartup = pendingMicStartupDisposerRef.current;
    pendingMicStartupDisposerRef.current = null;
    disposePendingStartup?.();

    microphoneGainRef.current?.disconnect();
    microphoneGainRef.current = null;
    closeAudioContext(microphoneVolumeContextRef.current);
    microphoneVolumeContextRef.current = null;

    if (microphoneNoiseGateWorkletNodeRef.current) {
      microphoneNoiseGateWorkletNodeRef.current.disconnect();
      microphoneNoiseGateWorkletNodeRef.current = null;
    }

    if (microphoneNoiseGateAudioContextRef.current) {
      closeAudioContext(microphoneNoiseGateAudioContextRef.current);
      microphoneNoiseGateAudioContextRef.current = null;
    }

    nsAudioContextsRef.current.forEach(closeAudioContext);
    nsAudioContextsRef.current = [];

    rawMicrophoneStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());
    rawMicrophoneStreamRef.current = null;

    transmitMicrophoneTrackRef.current?.stop();
    transmitMicrophoneTrackRef.current = null;
  }, [directMicrophone]);

  useEffect(() => {
    micMutedRef.current = ownVoiceState.micMuted;
    syncTransmitMicrophoneTrackState();
  }, [ownVoiceState.micMuted, syncTransmitMicrophoneTrackState]);

  useEffect(() => {
    if (!microphoneNoiseGateWorkletNodeRef.current) return;

    postNoiseGateWorkletConfig(microphoneNoiseGateWorkletNodeRef.current, {
      enabled: devices.noiseGateEnabled ?? true,
      holdMs: MICROPHONE_GATE_CLOSE_HOLD_MS
    });
  }, [devices.noiseGateEnabled]);

  useEffect(() => {
    if (!microphoneNoiseGateWorkletNodeRef.current) return;

    postNoiseGateWorkletConfig(microphoneNoiseGateWorkletNodeRef.current, {
      thresholdDb: clampMicrophoneDecibels(
        devices.noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
      )
    });
  }, [devices.noiseGateThresholdDb]);

  useEffect(() => {
    microphoneVolumeRef.current = devices.microphoneVolume;
    const gain = microphoneGainRef.current;
    const context = microphoneVolumeContextRef.current;
    if (!gain || !context) return;

    gain.gain.setTargetAtTime(
      devices.microphoneVolume / 100,
      context.currentTime,
      0.01
    );
  }, [devices.microphoneVolume]);

  const startMicStream = useCallback(async () => {
    const sessionGeneration = sessionGenerationRef.current;
    const transport = producerTransport.current;
    let cancelled = false;
    const isCurrentSession = () =>
      !cancelled &&
      sessionGeneration === sessionGenerationRef.current &&
      transport === producerTransport.current;
    let rawStream: MediaStream | undefined;
    let gateContext: AudioContext | null = null;
    let volumeContext: AudioContext | null = null;
    let volumeGain: GainNode | null = null;
    let gateNode: AudioWorkletNode | null = null;
    let nsContexts: AudioContext[] = [];
    const tracks = new Set<MediaStreamTrack>();
    const disposeLocalResources = () => {
      volumeGain?.disconnect();
      closeAudioContext(volumeContext);
      gateNode?.disconnect();
      closeAudioContext(gateContext);
      nsContexts.forEach(closeAudioContext);
      rawStream?.getTracks().forEach((track) => track.stop());
      tracks.forEach((track) => track.stop());
    };
    const cancelStartup = () => {
      cancelled = true;
      disposeLocalResources();
    };
    try {
      logVoice('mic: starting');
      cleanupMicProcessingResources();
      // Own acquired resources before any asynchronous processing begins.
      pendingMicStartupDisposerRef.current = cancelStartup;

      const useNsChain =
        devices.noiseSuppression === NoiseSuppression.DTLN ||
        devices.noiseSuppression === NoiseSuppression.RNNOISE;
      const useStandardNs =
        devices.noiseSuppression === NoiseSuppression.STANDARD;
      const useDtln = devices.noiseSuppression === NoiseSuppression.DTLN;

      const hasSpecificMic =
        !!devices.microphoneId && devices.microphoneId !== 'default';

      const micStreamConstraints: MediaStreamConstraints = {
        audio: {
          deviceId: hasSpecificMic
            ? { exact: devices.microphoneId }
            : undefined,
          autoGainControl: devices.autoGainControl,
          echoCancellation: devices.echoCancellation,
          noiseSuppression: useStandardNs,
          sampleRate: useDtln ? 16000 : undefined,
          channelCount: 1
        },
        video: false
      };

      logVoice('mic: requesting stream', {
        constraints: micStreamConstraints
      });

      rawStream =
        await navigator.mediaDevices.getUserMedia(micStreamConstraints);

      logVoice('mic: stream obtained', {
        trackId: rawStream.getAudioTracks()[0]?.id,
        label: rawStream.getAudioTracks()[0]?.label
      });

      if (!isCurrentSession()) {
        rawStream.getTracks().forEach((track) => track.stop());
        return;
      }

      const rawAudioTrack = rawStream.getAudioTracks()[0];

      if (rawAudioTrack) {
        const shouldUseNoiseGate = !!devices.noiseGateEnabled;
        const noiseGateAvailability = getNoiseGateWorkletAvailabilitySnapshot();
        let transmitTrack: MediaStreamTrack = rawAudioTrack;
        let transmitStream: MediaStream = rawStream;

        if (shouldUseNoiseGate && noiseGateAvailability.available) {
          let audioContext: AudioContext | null = null;

          try {
            audioContext = new window.AudioContext();
            gateContext = audioContext;
            const source = audioContext.createMediaStreamSource(rawStream);
            const noiseGateNode = await createNoiseGateWorkletNode(
              audioContext,
              {
                enabled: true,
                thresholdDb: clampMicrophoneDecibels(
                  devices.noiseGateThresholdDb ??
                    MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
                ),
                holdMs: MICROPHONE_GATE_CLOSE_HOLD_MS
              }
            );
            gateNode = noiseGateNode;
            gateContext = audioContext;
            if (!isCurrentSession()) {
              disposeLocalResources();
              return;
            }
            const destination = audioContext.createMediaStreamDestination();

            source.connect(noiseGateNode);
            noiseGateNode.connect(destination);

            const processedTrack = destination.stream.getAudioTracks()[0];

            if (processedTrack) {
              tracks.add(processedTrack);
              transmitTrack = processedTrack;
              transmitStream = destination.stream;
            } else {
              noiseGateNode.disconnect();
              closeAudioContext(audioContext);
              audioContext = null;
              gateContext = null;
              gateNode = null;
              logVoiceWarn(
                'mic: noise gate produced no track, using ungated stream'
              );
            }
          } catch (error) {
            if (audioContext) {
              closeAudioContext(audioContext);
            }

            gateContext = null;
            gateNode = null;
            if (!isCurrentSession()) {
              disposeLocalResources();
              return;
            }
            logVoiceError(
              'mic: noise gate worklet failed, using ungated stream',
              error
            );
            markNoiseGateWorkletUnavailable(
              'Failed to initialize the noise gate audio processor.'
            );
          }
        } else if (shouldUseNoiseGate && !noiseGateAvailability.available) {
          logVoiceWarn('mic: noise gate unavailable, using ungated stream', {
            reason: noiseGateAvailability.reason
          });
        }

        if (useNsChain) {
          logVoice('mic: setting up noise suppression', {
            type: devices.noiseSuppression
          });

          try {
            const chain = await createNsChain(
              devices.noiseSuppression,
              transmitStream,
              (context) => {
                nsContexts.push(context);
                if (!isCurrentSession()) closeAudioContext(context);
              }
            );
            nsContexts = chain.contexts;
            tracks.add(chain.outputTrack);
            if (!isCurrentSession()) {
              disposeLocalResources();
              return;
            }
            transmitTrack = chain.outputTrack;
            transmitStream = new MediaStream([chain.outputTrack]);
            logVoice('mic: noise suppression ready');
          } catch (nsError) {
            if (!isCurrentSession()) {
              disposeLocalResources();
              return;
            }
            logVoiceWarn('mic: noise suppression setup failed', {
              error: nsError
            });
          }
        }

        if (!isCurrentSession()) {
          disposeLocalResources();
          return;
        }
        volumeContext = new window.AudioContext();
        const volumeSource =
          volumeContext.createMediaStreamSource(transmitStream);
        volumeGain = volumeContext.createGain();
        volumeGain.gain.value = microphoneVolumeRef.current / 100;
        const volumeDestination = volumeContext.createMediaStreamDestination();
        volumeSource.connect(volumeGain);
        volumeGain.connect(volumeDestination);
        const volumeTracks = volumeDestination.stream.getAudioTracks();
        transmitTrack = volumeTracks[0]!;
        tracks.add(transmitTrack);
        transmitStream = volumeDestination.stream;
        microphoneVolumeContextRef.current = volumeContext;
        microphoneGainRef.current = volumeGain;
        rawMicrophoneStreamRef.current = rawStream;
        microphoneNoiseGateAudioContextRef.current = gateContext;
        microphoneNoiseGateWorkletNodeRef.current = gateNode;
        nsAudioContextsRef.current = nsContexts;
        transmitMicrophoneTrackRef.current = transmitTrack;
        microphoneRouteRef.current = shouldAttemptDirect(StreamKind.AUDIO)
          ? 'direct'
          : 'relay';
        setLocalAudioStream(transmitStream);
        syncTransmitMicrophoneTrackState();

        logVoice('mic: audio track obtained', {
          trackId: rawAudioTrack.id,
          readyState: rawAudioTrack.readyState,
          settings: rawAudioTrack.getSettings()
        });

        if (!transport) {
          throw new Error('Producer transport is not available');
        }

        let publication = 0;
        const publishMicrophone = async () => {
          const currentPublication = ++publication;
          const isCurrentPublication = () =>
            isCurrentSession() &&
            rawMicrophoneStreamRef.current === rawStream &&
            publication === currentPublication;
          try {
            localAudioProducer.current?.close();
            localAudioProducer.current = undefined;
            directMicrophone.stop();
            const attemptDirect = shouldAttemptDirect(StreamKind.AUDIO);
            microphoneRouteRef.current = attemptDirect ? 'direct' : 'relay';
            const path = attemptDirect
              ? await directMicrophone.start(transmitStream, {
                  maxBitrate: 128000,
                  onFailure: async () => {
                    if (!isCurrentPublication()) return;
                    markP2pFallback(StreamKind.AUDIO);
                    await republishMicrophoneRef.current();
                  }
                })
              : 'relay';
            if (!isCurrentPublication()) return;
            if (attemptDirect && path !== 'direct') {
              markP2pFallback(StreamKind.AUDIO);
              logVoiceWarn('mic: P2P failed, falling back to relay');
              toast.info(t('p2pFallbackToRelay'));
            }
            microphoneRouteRef.current = path === 'direct' ? 'direct' : 'relay';
            const producer =
              path !== 'direct'
                ? await transport.produce({
                    track: transmitTrack,
                    stopTracks: false,
                    codecOptions: {
                      opusStereo: false,
                      opusFec: true,
                      opusDtx: false,
                      opusMaxPlaybackRate: 48000,
                      opusMaxAverageBitrate: 128000
                    },
                    appData: { kind: StreamKind.AUDIO }
                  })
                : undefined;

            if (!isCurrentPublication()) {
              producer?.close();
              return;
            }
            localAudioProducer.current = producer;

            logVoice('mic: producer created', {
              producerId: producer?.id,
              path
            });

            localAudioProducer.current?.observer.on('close', async () => {
              if (
                !producer ||
                !isCurrentSession() ||
                localAudioProducer.current !== producer
              )
                return;
              logVoice('mic: producer closed');

              const trpc = getTRPCClient();

              try {
                await trpc.voice.closeProducer.mutate({
                  kind: StreamKind.AUDIO,
                  producerId: producer.id
                });
              } catch (error) {
                logVoiceError(
                  'mic: closing producer on the server failed',
                  error
                );
              }
            });
          } catch (error) {
            if (!isCurrentPublication()) return;
            logVoiceError('mic: publishing failed', error);
            cleanupMicProcessingResources();
            disposeLocalResources();
            setLocalAudioStream(undefined);
            throw error;
          }
        };
        republishMicrophoneRef.current = publishMicrophone;
        await publishMicrophone();

        rawAudioTrack.onended = () => {
          if (
            !isCurrentSession() ||
            rawMicrophoneStreamRef.current !== rawStream
          )
            return;
          logVoiceWarn('mic: track ended, cleaning up');

          transmitStream.getAudioTracks().forEach((track) => {
            track.stop();
          });
          cleanupMicProcessingResources();
          localAudioProducer.current?.close();
          localAudioProducer.current = undefined;

          setLocalAudioStream(undefined);
          const now = Date.now();
          const recentRecoveries = micRecoveryHistoryRef.current.filter(
            (at) => now - at < 30_000
          );
          if (recentRecoveries.length >= 3) {
            logVoiceWarn(
              'mic: recovery stopped after repeated capture failures'
            );
            toast.error(t('failedRestoreMicrophone'));
            return;
          }
          micRecoveryHistoryRef.current = [...recentRecoveries, now];
          // An audio-service restart ends the old capture permanently. Acquire
          // a fresh track without reconnecting the transport or changing mute.
          micRecoveryTimerRef.current = setTimeout(async () => {
            micRecoveryTimerRef.current = null;
            if (!isCurrentSession() || transport?.closed) return;
            logVoice('mic: recovering ended capture');
            await startMicStreamRef.current();
            if (
              isCurrentSession() &&
              !transport?.closed &&
              !pendingMicStartupDisposerRef.current &&
              !rawMicrophoneStreamRef.current
            ) {
              logVoiceWarn('mic: automatic capture recovery failed');
              toast.error(t('failedRestoreMicrophone'));
            }
          }, 500);
        };
      } else {
        rawStream.getTracks().forEach((track) => track.stop());
        throw new Error('Failed to obtain audio track from microphone');
      }
    } catch (error) {
      disposeLocalResources();
      if (!isCurrentSession()) return;
      cleanupMicProcessingResources();
      setLocalAudioStream(undefined);
      logVoiceError('mic: start failed', error);
    } finally {
      // A late completion must never unregister B's pending startup.
      if (pendingMicStartupDisposerRef.current === cancelStartup) {
        pendingMicStartupDisposerRef.current = null;
      }
    }
  }, [
    cleanupMicProcessingResources,
    t,
    sessionGenerationRef,
    producerTransport,
    setLocalAudioStream,
    localAudioProducer,
    syncTransmitMicrophoneTrackState,
    directMicrophone,
    shouldAttemptDirect,
    markP2pFallback,
    devices.microphoneId,
    devices.autoGainControl,
    devices.echoCancellation,
    devices.noiseSuppression,
    devices.noiseGateEnabled,
    devices.noiseGateThresholdDb
  ]);

  useEffect(() => {
    startMicStreamRef.current = startMicStream;
  }, [startMicStream]);

  useEffect(() => {
    if (selectedMicrophoneIdRef.current === devices.microphoneId) return;
    selectedMicrophoneIdRef.current = devices.microphoneId;
    if (
      !rawMicrophoneStreamRef.current &&
      !pendingMicStartupDisposerRef.current
    )
      return;

    startMicStreamRef
      .current()
      .catch((error) => logVoiceError('mic: device change failed', error));
  }, [devices.microphoneId]);

  useEffect(() => {
    if (
      connectionStatus !== ConnectionStatus.CONNECTING &&
      connectionStatus !== ConnectionStatus.CONNECTED
    )
      return;
    const track = rawMicrophoneStreamRef.current?.getAudioTracks()[0];
    if (!track || track.readyState !== 'live') return;
    const path = shouldAttemptDirect(StreamKind.AUDIO) ? 'direct' : 'relay';
    if (microphoneRouteRef.current === path) return;
    microphoneRouteRef.current = path;
    republishMicrophoneRef
      .current()
      .catch((error) => logVoiceError('mic: republishing failed', error));
  }, [
    connectionStatus,
    localAudioStream,
    directMediaPolicy,
    shouldAttemptDirect,
    localAudioProducer
  ]);

  const startWebcamStream = useCallback(
    async (existingStream?: MediaStream) => {
      if (voiceOnlyModeRef.current) {
        throw new Error('Voice-only mode does not allow webcam capture');
      }
      const generation = ++webcamGenerationRef.current;
      let capturedStream: MediaStream | undefined;
      try {
        logVoice('webcam: starting');

        const hasSpecificWebcam =
          !!devices?.webcamId && devices.webcamId !== 'default';

        const webcamConstraints: MediaStreamConstraints = {
          video: {
            deviceId: hasSpecificWebcam
              ? { exact: devices.webcamId }
              : undefined,
            frameRate: devices.webcamFramerate,
            ...getResWidthHeight(devices?.webcamResolution)
          },
          audio: false
        };

        logVoice(
          existingStream
            ? 'webcam: republishing captured stream'
            : 'webcam: requesting stream',
          { constraints: webcamConstraints }
        );

        const stream =
          existingStream ??
          (await navigator.mediaDevices.getUserMedia(webcamConstraints));
        capturedStream = stream;
        if (
          voiceOnlyModeRef.current ||
          generation !== webcamGenerationRef.current
        ) {
          throw new Error('Webcam capture ended');
        }
        capturedWebcamStreamRef.current = stream;

        logVoice('webcam: stream obtained', {
          trackId: stream.getVideoTracks()[0]?.id,
          label: stream.getVideoTracks()[0]?.label
        });

        webcamRouteRef.current = shouldAttemptDirect(StreamKind.VIDEO)
          ? 'direct'
          : 'relay';
        setLocalVideoStream(stream);

        const videoTrack = stream.getVideoTracks()[0];

        if (videoTrack) {
          logVoice('webcam: video track obtained', {
            trackId: videoTrack.id,
            readyState: videoTrack.readyState,
            settings: videoTrack.getSettings()
          });

          const simulcastCodec = simulcastEnabled
            ? getSimulcastCodec(routerRtpCapabilities.current)
            : undefined;

          const webcamProducerOptions: ProducerOptions<TVideoProducerAppData> =
            {
              track: videoTrack,
              stopTracks: false,
              appData: {
                kind: StreamKind.VIDEO
              }
            };
          let simulcastWebcamProducerOptions = webcamProducerOptions;

          if (simulcastCodec) {
            logVoice('webcam: using vp8 for simulcast', {
              codec: simulcastCodec.mimeType
            });

            const encodings = getSimulcastEncodings(
              SIMULCAST_WEBCAM_MAX_BITRATE
            );

            const qualityLayers = getSimulcastQualityLayers(encodings);

            simulcastWebcamProducerOptions = {
              ...webcamProducerOptions,
              appData: { kind: StreamKind.VIDEO, qualityLayers },
              codec: simulcastCodec,
              encodings
            };
          }

          const attemptDirect = shouldAttemptDirect(StreamKind.VIDEO);
          const path = attemptDirect
            ? await directWebcam.start(stream, {
                maxBitrate: SIMULCAST_WEBCAM_MAX_BITRATE,
                onFailure: async () => {
                  if (
                    capturedWebcamStreamRef.current !== stream ||
                    generation !== webcamGenerationRef.current
                  )
                    return;
                  markP2pFallback(StreamKind.VIDEO);
                  await restartWebcamStreamRef.current();
                }
              })
            : 'relay';
          if (
            voiceOnlyModeRef.current ||
            generation !== webcamGenerationRef.current ||
            capturedWebcamStreamRef.current !== stream
          )
            throw new Error('Webcam capture ended');
          if (attemptDirect && path !== 'direct') {
            markP2pFallback(StreamKind.VIDEO);
            logVoiceWarn('webcam: P2P failed, falling back to relay');
            toast.info(t('p2pFallbackToRelay'));
          }
          webcamRouteRef.current = path === 'direct' ? 'direct' : 'relay';
          let webcamProducer: typeof localVideoProducer.current;
          if (path !== 'direct') {
            try {
              webcamProducer = await producerTransport.current?.produce(
                simulcastWebcamProducerOptions
              );
            } catch (error) {
              if (
                !simulcastCodec ||
                voiceOnlyModeRef.current ||
                generation !== webcamGenerationRef.current
              )
                throw error;
              logVoiceWarn(
                'webcam: simulcast producer failed, retrying without simulcast',
                {
                  error: getErrorMessage(error)
                }
              );
              webcamProducer = await producerTransport.current?.produce(
                webcamProducerOptions
              );
            }
          }

          logVoice('webcam: producer created', {
            producerId: webcamProducer?.id
          });

          webcamProducer?.observer.on('close', async () => {
            logVoice('webcam: producer closed');

            const trpc = getTRPCClient();

            try {
              await trpc.voice.closeProducer.mutate({
                kind: StreamKind.VIDEO,
                producerId: webcamProducer?.id
              });
            } catch (error) {
              logVoiceError(
                'webcam: closing producer on the server failed',
                error
              );
            }
          });
          if (
            voiceOnlyModeRef.current ||
            generation !== webcamGenerationRef.current ||
            capturedWebcamStreamRef.current !== stream
          ) {
            webcamProducer?.close();
            throw new Error('Webcam capture ended');
          }
          localVideoProducer.current = webcamProducer;

          videoTrack.onended = () => {
            logVoiceWarn('webcam: track ended, cleaning up');

            if (capturedWebcamStreamRef.current !== stream) return;
            directWebcam.stop();
            stream.getTracks().forEach((track) => track.stop());
            capturedWebcamStreamRef.current = undefined;
            localVideoProducer.current?.close();

            setLocalVideoStream(undefined);
          };
        } else {
          throw new Error('Failed to obtain video track from webcam');
        }
      } catch (error) {
        if (
          capturedWebcamStreamRef.current !== capturedStream ||
          generation === webcamGenerationRef.current
        )
          capturedStream?.getTracks().forEach((track) => track.stop());
        if (
          capturedWebcamStreamRef.current === capturedStream &&
          generation === webcamGenerationRef.current
        ) {
          capturedWebcamStreamRef.current = undefined;
          setLocalVideoStream(undefined);
        }
        logVoiceError('webcam: start failed', error);
        throw error;
      }
    },
    [
      setLocalVideoStream,
      localVideoProducer,
      producerTransport,
      devices.webcamId,
      devices.webcamFramerate,
      devices.webcamResolution,
      simulcastEnabled,
      shouldAttemptDirect,
      markP2pFallback,
      directWebcam,
      t
    ]
  );

  const stopWebcamStream = useCallback(() => {
    logVoice('webcam: stopping');
    directWebcam.stop();

    webcamGenerationRef.current++;
    const stream = capturedWebcamStreamRef.current;
    capturedWebcamStreamRef.current = undefined;
    stream?.getTracks().forEach((track) => {
      logVoice('webcam: stopping track', { trackId: track.id });
      track.stop();
    });

    localVideoProducer.current?.close();
    localVideoProducer.current = undefined;

    setLocalVideoStream(undefined);
  }, [setLocalVideoStream, localVideoProducer, directWebcam]);

  useEffect(() => {
    restartWebcamStreamRef.current = async () => {
      const sessionGeneration = sessionGenerationRef.current;
      const stream = capturedWebcamStreamRef.current;
      if (!stream || voiceOnlyModeRef.current) return;
      directWebcam.stop();
      localVideoProducer.current?.close();
      localVideoProducer.current = undefined;
      const pending = startWebcamStream(stream);
      const generation = webcamGenerationRef.current;
      try {
        await pending;
        if (
          sessionGeneration !== sessionGenerationRef.current ||
          generation !== webcamGenerationRef.current ||
          voiceOnlyModeRef.current
        )
          return;
        const trpc = getTRPCClient();
        await trpc.voice.updateState.mutate({ webcamEnabled: true });
      } catch (error) {
        if (
          sessionGeneration !== sessionGenerationRef.current ||
          generation !== webcamGenerationRef.current ||
          voiceOnlyModeRef.current
        )
          return;
        updateOwnVoiceState({ webcamEnabled: false });
        try {
          const trpc = getTRPCClient();
          await trpc.voice.updateState.mutate({ webcamEnabled: false });
        } catch (stateError) {
          logVoiceError('webcam: updating stopped camera failed', stateError);
        }
        if (
          sessionGeneration === sessionGenerationRef.current &&
          generation === webcamGenerationRef.current
        )
          toast.error(t('directMediaFailed'));
        logVoiceError('webcam: republishing failed', error);
      }
    };
  }, [
    startWebcamStream,
    directWebcam,
    localVideoProducer,
    sessionGenerationRef,
    t
  ]);

  useEffect(() => {
    if (
      voiceOnlyMode ||
      (connectionStatus !== ConnectionStatus.CONNECTING &&
        connectionStatus !== ConnectionStatus.CONNECTED)
    )
      return;
    const track = capturedWebcamStreamRef.current?.getVideoTracks()[0];
    if (!track || track.readyState !== 'live') return;
    const path = shouldAttemptDirect(StreamKind.VIDEO) ? 'direct' : 'relay';
    if (webcamRouteRef.current === path) return;
    webcamRouteRef.current = path;
    restartWebcamStreamRef
      .current()
      .catch((error) => logVoiceError('webcam: rerouting failed', error));
  }, [
    voiceOnlyMode,
    connectionStatus,
    localVideoStream,
    directMediaPolicy,
    shouldAttemptDirect
  ]);

  const stopScreenShareStream = useCallback(() => {
    logVoice('screen: stopping');
    setScreenRoute(undefined);
    screenRoutingRef.current = undefined;

    screenShareGenerationRef.current++;
    const stream = capturedScreenStreamRef.current;
    capturedScreenStreamRef.current = undefined;
    directScreenShare.stop();

    stream?.getTracks().forEach((track) => {
      logVoice('screen: stopping track', {
        trackId: track.id,
        kind: track.kind
      });

      track.stop();
    });

    localScreenShareProducer.current?.close();
    localScreenShareProducer.current = undefined;

    localScreenShareAudioProducer.current?.close();
    localScreenShareAudioProducer.current = undefined;

    setScreenShareProducer(null);
    setLocalScreenShare(undefined);
    setLocalScreenShareAudio(undefined);
  }, [
    directScreenShare,
    setLocalScreenShare,
    setLocalScreenShareAudio,
    localScreenShareProducer,
    localScreenShareAudioProducer,
    setScreenShareProducer
  ]);

  const produceScreenShareStream = useCallback(
    async (stream: MediaStream) => {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const transport = producerTransport.current;
      if (!transport || transport.closed) {
        throw new Error('Screen share transport is unavailable');
      }
      if (
        voiceOnlyModeRef.current ||
        capturedScreenStreamRef.current !== stream ||
        videoTrack?.readyState !== 'live'
      ) {
        throw new Error('Screen share ended');
      }
      if (videoTrack) {
        logVoice('screen: video track obtained', {
          trackId: videoTrack.id,
          readyState: videoTrack.readyState,
          settings: videoTrack.getSettings()
        });

        let preferredCodec: RtpCodecCapability | undefined;
        const screenPreset = getScreenSharePreset({
          screenResolution: devices.screenResolution,
          screenFramerate: devices.screenFramerate,
          screenBitrate: devices.screenBitrate
        });
        const presetSettings = screenPreset
          ? getScreenSharePresetSettings(screenPreset)
          : undefined;
        // motion already asks the encoder for every frame; simulcast multiplies
        // that load without helping constrained viewers enough to justify it.
        const effectiveSimulcast =
          screenShareSimulcastEnabled &&
          screenPreset !== ScreenSharePreset.MOTION;

        if (!effectiveSimulcast && routerRtpCapabilities.current?.codecs) {
          const candidates = getScreenShareCodecCandidates(
            screenPreset,
            devices.screenCodec
          );
          for (const candidate of candidates) {
            preferredCodec = routerRtpCapabilities.current.codecs.find(
              (codec) =>
                codec.mimeType.toLowerCase() === candidate.toLowerCase()
            );
            if (preferredCodec) {
              logVoice('screen: using preferred codec', {
                codec: preferredCodec.mimeType
              });
              break;
            }
          }
        }

        const maxBitrateKbps = devices.screenBitrate ?? DEFAULT_BITRATE;
        const simulcastCodec = effectiveSimulcast
          ? getSimulcastCodec(routerRtpCapabilities.current)
          : undefined;
        const screenCodec = simulcastCodec ?? preferredCodec;

        if (simulcastCodec) {
          logVoice('screen: using vp8 for simulcast', {
            codec: simulcastCodec.mimeType
          });
        } else if (effectiveSimulcast) {
          logVoice(
            'VP8 is unavailable, creating screen share without simulcast'
          );
        }
        const startBitrateKbps = Math.min(
          presetSettings?.startBitrateKbps ?? 2000,
          maxBitrateKbps
        );
        const screenShareProducerOptions: ProducerOptions<TVideoProducerAppData> =
          {
            track: videoTrack,
            stopTracks: false,
            codec: screenCodec,
            encodings: simulcastCodec
              ? undefined
              : [
                  {
                    maxBitrate: maxBitrateKbps * 1000,
                    maxFramerate: devices.screenFramerate
                  }
                ],
            codecOptions: {
              videoGoogleStartBitrate: startBitrateKbps,
              videoGoogleMaxBitrate: maxBitrateKbps,
              videoGoogleMinBitrate: Math.min(200, maxBitrateKbps)
            },
            appData: {
              kind: StreamKind.SCREEN
            }
          };
        const fallbackScreenShareProducerOptions = {
          ...screenShareProducerOptions,
          codec: preferredCodec
        };
        let simulcastScreenShareProducerOptions = screenShareProducerOptions;

        if (simulcastCodec) {
          const encodings = getScreenShareSimulcastEncodings(
            maxBitrateKbps * 1000
          );
          const qualityLayers = getSimulcastQualityLayers(encodings);

          simulcastScreenShareProducerOptions = {
            ...screenShareProducerOptions,
            appData: { kind: StreamKind.SCREEN, qualityLayers },
            encodings
          };
        }
        let screenProducer: typeof localScreenShareProducer.current;

        try {
          screenProducer = await transport.produce(
            simulcastScreenShareProducerOptions
          );
        } catch (error) {
          if (
            !simulcastCodec ||
            voiceOnlyModeRef.current ||
            capturedScreenStreamRef.current !== stream
          )
            throw error;

          logVoiceWarn(
            'screen: simulcast producer failed, retrying without simulcast',
            { error: getErrorMessage(error) }
          );

          screenProducer = await transport.produce(
            fallbackScreenShareProducerOptions
          );
        }

        logVoice('screen: producer created', {
          producerId: screenProducer?.id,
          simulcast: !!simulcastCodec
        });

        screenProducer?.observer.on('close', async () => {
          logVoice('screen: producer closed');

          try {
            const trpc = getTRPCClient();
            await trpc.voice.closeProducer.mutate({
              kind: StreamKind.SCREEN,
              producerId: screenProducer?.id
            });
          } catch (error) {
            logVoiceError(
              'screen: closing producer on the server failed',
              error
            );
          }
        });

        if (
          voiceOnlyModeRef.current ||
          capturedScreenStreamRef.current !== stream ||
          videoTrack.readyState !== 'live'
        ) {
          screenProducer?.close();
          throw new Error('Screen share ended');
        }
        localScreenShareProducer.current = screenProducer;
        setScreenShareProducer(screenProducer);

        if (audioTrack?.readyState === 'live') {
          logVoice('screen audio: audio track obtained', {
            trackId: audioTrack.id,
            settings: audioTrack.getSettings()
          });

          const screenAudioProducer = await transport.produce({
            track: audioTrack,
            stopTracks: false,
            codecOptions: {
              opusStereo: true,
              opusFec: true,
              opusDtx: false,
              opusMaxPlaybackRate: 48000,
              opusMaxAverageBitrate: 128000
            },
            appData: { kind: StreamKind.SCREEN_AUDIO }
          });

          logVoice('screen audio: producer created', {
            producerId: screenAudioProducer?.id
          });

          screenAudioProducer?.observer.on('close', async () => {
            logVoice('screen audio: producer closed');

            try {
              const trpc = getTRPCClient();
              await trpc.voice.closeProducer.mutate({
                kind: StreamKind.SCREEN_AUDIO,
                producerId: screenAudioProducer.id
              });
            } catch (error) {
              logVoiceError(
                'screen audio: closing producer on the server failed',
                error
              );
            }
          });

          if (
            voiceOnlyModeRef.current ||
            capturedScreenStreamRef.current !== stream ||
            videoTrack.readyState !== 'live'
          ) {
            screenAudioProducer?.close();
            screenProducer?.close();
            throw new Error('Screen share ended');
          }
          localScreenShareAudioProducer.current = screenAudioProducer;
        }

        return videoTrack;
      } else {
        throw new Error('No video track obtained for screen share');
      }
    },
    [
      devices.screenCodec,
      devices.screenBitrate,
      devices.screenResolution,
      devices.screenFramerate,
      screenShareSimulcastEnabled,
      localScreenShareProducer,
      localScreenShareAudioProducer,
      producerTransport,
      setScreenShareProducer
    ]
  );

  const publishScreenShare = useCallback(
    async (stream: MediaStream) => {
      const publication = Symbol();
      screenPublicationRef.current = publication;
      const videoTrack = stream.getVideoTracks()[0];
      const attemptDirect = shouldAttemptDirect(StreamKind.SCREEN);
      const path = attemptDirect
        ? await directScreenShare.start(stream, {
            maxBitrate: (devices.screenBitrate ?? DEFAULT_BITRATE) * 1000,
            maxFramerate: devices.screenFramerate,
            codec: devices.screenCodec,
            onFailure: async (relayAllowed) => {
              if (
                capturedScreenStreamRef.current !== stream ||
                screenPublicationRef.current !== publication
              )
                return;
              if (relayAllowed) {
                markP2pFallback(StreamKind.SCREEN);
                await republishScreenRef.current();
                return;
              }
              stopScreenShareStream();
              const generation = screenShareGenerationRef.current;
              updateOwnVoiceState({ sharingScreen: false });
              try {
                const trpc = getTRPCClient();
                await trpc.voice.updateState.mutate({ sharingScreen: false });
              } catch (error) {
                logVoiceError('screen: updating stopped share failed', error);
              }
              if (generation === screenShareGenerationRef.current)
                toast.error(t('directMediaFailed'));
            }
          })
        : 'relay';
      if (
        voiceOnlyModeRef.current ||
        capturedScreenStreamRef.current !== stream ||
        videoTrack?.readyState !== 'live'
      )
        throw new Error('Screen share ended');
      if (attemptDirect && path !== 'direct') {
        markP2pFallback(StreamKind.SCREEN);
        logVoiceWarn('screen: P2P failed, falling back to relay');
        toast.info(t('p2pFallbackToRelay'));
      }
      if (path !== 'direct') await produceScreenShareStream(stream);
      if (
        capturedScreenStreamRef.current !== stream ||
        voiceOnlyModeRef.current
      )
        throw new Error('Screen share ended');
      setScreenRoute(path === 'direct' ? 'direct' : 'relay');
      return videoTrack;
    },
    [
      devices.screenBitrate,
      devices.screenCodec,
      devices.screenFramerate,
      directScreenShare,
      produceScreenShareStream,
      stopScreenShareStream,
      shouldAttemptDirect,
      markP2pFallback,
      t
    ]
  );

  useEffect(() => {
    republishScreenRef.current = async () => {
      const stream = capturedScreenStreamRef.current;
      if (!stream || voiceOnlyModeRef.current || screenRoutingRef.current)
        return;
      const token = Symbol();
      screenRoutingRef.current = token;
      setScreenRoute(undefined);
      localScreenShareProducer.current?.close();
      localScreenShareAudioProducer.current?.close();
      localScreenShareProducer.current = undefined;
      localScreenShareAudioProducer.current = undefined;
      setScreenShareProducer(undefined);
      directScreenShare.stop();
      try {
        await publishScreenShare(stream);
      } catch (error) {
        if (
          capturedScreenStreamRef.current !== stream ||
          screenRoutingRef.current !== token
        )
          return;
        stopScreenShareStream();
        updateOwnVoiceState({ sharingScreen: false });
        try {
          const trpc = getTRPCClient();
          await trpc.voice.updateState.mutate({ sharingScreen: false });
        } catch (stateError) {
          logVoiceError('screen: updating stopped share failed', stateError);
        }
        toast.error(t('directMediaFailed'));
        logVoiceError('screen: republishing failed', error);
      } finally {
        if (screenRoutingRef.current === token)
          screenRoutingRef.current = undefined;
      }
    };
  }, [
    publishScreenShare,
    stopScreenShareStream,
    directScreenShare,
    localScreenShareProducer,
    localScreenShareAudioProducer,
    setScreenShareProducer,
    t
  ]);

  useEffect(() => {
    if (
      !screenRoute ||
      voiceOnlyMode ||
      (connectionStatus !== ConnectionStatus.CONNECTING &&
        connectionStatus !== ConnectionStatus.CONNECTED)
    )
      return;
    const path = shouldAttemptDirect(StreamKind.SCREEN) ? 'direct' : 'relay';
    if (screenRoute === path) return;
    republishScreenRef
      .current()
      .catch((error) => logVoiceError('screen: rerouting failed', error));
  }, [
    screenRoute,
    voiceOnlyMode,
    connectionStatus,
    directMediaPolicy,
    shouldAttemptDirect
  ]);

  const startScreenShareStream = useCallback(async () => {
    if (voiceOnlyModeRef.current) {
      throw new Error('Voice-only mode does not allow screen capture');
    }
    const generation = ++screenShareGenerationRef.current;
    try {
      logVoice('screen: starting');
      const canRestrictOwnAudio = getRestrictOwnAudioSupport();
      const canSuppressLocalAudioPlayback =
        getSuppressLocalAudioPlaybackSupport();

      const displayMediaConstraints: MediaStreamConstraints = {
        video: {
          ...getResWidthHeight(devices?.screenResolution),
          frameRate: devices?.screenFramerate,
          // @ts-expect-error - display capture only, not in MediaTrackConstraints
          cursor: devices.screenCursor
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
          sampleRate: 48000,
          // @ts-expect-error - experimental, not in types yet
          suppressLocalAudioPlayback: canSuppressLocalAudioPlayback
            ? (devices.suppressLocalAudioPlayback ?? false)
            : undefined,
          restrictOwnAudio: canRestrictOwnAudio
            ? (devices.restrictOwnAudio ?? false)
            : undefined
        }
      };

      logVoice('screen: requesting display media', {
        constraints: displayMediaConstraints
      });

      const stream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaConstraints
      );

      if (
        voiceOnlyModeRef.current ||
        generation !== screenShareGenerationRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('Screen share ended');
      }
      capturedScreenStreamRef.current = stream;

      logVoice('screen: stream obtained', {
        videoTrackId: stream.getVideoTracks()[0]?.id,
        hasAudio: stream.getAudioTracks().length > 0
      });
      setLocalScreenShare(stream);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (!videoTrack)
        throw new Error('No video track obtained for screen share');
      // A game redraws every pixel of every frame, and `detail` maps to
      // maintain-resolution, so the encoder dropped frames instead of
      // resolution and viewers saw a slideshow instead of a fullscreen game.
      // `motion` trades sharpness for a frame rate that holds up. The text
      // preset flips it back so code and slides stay legible.
      videoTrack.contentHint = getScreenShareContentHint({
        screenResolution: devices.screenResolution,
        screenFramerate: devices.screenFramerate,
        screenBitrate: devices.screenBitrate
      });
      videoTrack.onended = stopScreenShareStream;
      if (audioTrack) {
        setLocalScreenShareAudio(new MediaStream([audioTrack]));
        audioTrack.onended = () => {
          if (capturedScreenStreamRef.current !== stream) return;
          localScreenShareAudioProducer.current?.close();
          localScreenShareAudioProducer.current = undefined;
          setLocalScreenShareAudio(undefined);
        };
      }

      // the viewer must see the captured share before deciding to accept direct media.
      const trpc = getTRPCClient();
      const transport = producerTransport.current;
      await trpc.voice.updateState.mutate({ sharingScreen: true });
      if (
        voiceOnlyModeRef.current ||
        generation !== screenShareGenerationRef.current ||
        capturedScreenStreamRef.current !== stream ||
        videoTrack.readyState !== 'live'
      ) {
        if (
          !capturedScreenStreamRef.current &&
          transport === producerTransport.current &&
          transport &&
          !transport.closed
        ) {
          await trpc.voice.updateState.mutate({ sharingScreen: false });
        }
        throw new Error('Screen share ended');
      }

      return await publishScreenShare(stream);
    } catch (error) {
      if (generation === screenShareGenerationRef.current) {
        stopScreenShareStream();
      }
      logVoiceError('screen: start failed', error);
      throw error;
    }
  }, [
    setLocalScreenShare,
    setLocalScreenShareAudio,
    publishScreenShare,
    producerTransport,
    stopScreenShareStream,
    localScreenShareAudioProducer,
    devices.screenResolution,
    devices.screenFramerate,
    devices.screenBitrate,
    devices.restrictOwnAudio,
    devices.suppressLocalAudioPlayback,
    devices.screenCursor
  ]);

  useEffect(() => {
    const changed = previousVoiceOnlyModeRef.current !== voiceOnlyMode;
    previousVoiceOnlyModeRef.current = voiceOnlyMode;
    if (voiceOnlyMode) {
      stopWebcamStream();
      stopScreenShareStream();
      directScreenShare.close();
      updateOwnVoiceState({ webcamEnabled: false, sharingScreen: false });
    } else if (
      changed &&
      currentVoiceChannelId &&
      deviceRtpCapabilities.current &&
      consumerTransport.current
    ) {
      consumeExistingProducers(
        deviceRtpCapabilities.current,
        undefined,
        false
      ).catch((error) => {
        logVoiceError('session: resuming remote media failed', error);
      });
    }
  }, [
    voiceOnlyMode,
    currentVoiceChannelId,
    stopWebcamStream,
    stopScreenShareStream,
    directScreenShare,
    consumeExistingProducers,
    consumerTransport
  ]);

  const cleanup = useCallback(() => {
    logVoice('session: cleanup');

    stopMonitoring();
    resetStats();
    cleanupMicProcessingResources();
    micRecoveryHistoryRef.current = [];
    p2pFallbackKindsRef.current.clear();
    stopWebcamStream();
    stopScreenShareStream();
    const directCoordinators = Object.values(directMedia);
    directCoordinators.forEach((coordinator) => coordinator.close());
    clearLocalStreams();
    clearRemoteUserStreams();
    clearExternalStreams();
    cleanupTransports();
    voiceSessionAttemptRef.current = undefined;
    notifyVoiceSessionListeners();
    deviceRtpCapabilities.current = null;

    setLoading(false);
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
  }, [
    stopMonitoring,
    resetStats,
    cleanupMicProcessingResources,
    stopWebcamStream,
    stopScreenShareStream,
    directMedia,
    clearLocalStreams,
    clearRemoteUserStreams,
    clearExternalStreams,
    cleanupTransports,
    notifyVoiceSessionListeners
  ]);

  const init = useCallback(
    async (
      incomingRouterRtpCapabilities: RtpCapabilities,
      channelId: number
    ) => {
      if (!voiceProviderLifetimeRef.current.mounted) {
        throw new VoiceSessionCancelledError();
      }
      logVoice('session: initializing', {
        channelId,
        routerCodecs: incomingRouterRtpCapabilities.codecs?.length ?? 0
      });

      cleanup();

      const sessionGeneration = sessionGenerationRef.current;
      const sessionAttempt: TVoiceSessionAttempt = {
        channelId,
        generation: sessionGeneration,
        status: 'initializing'
      };
      voiceSessionAttemptRef.current = sessionAttempt;
      notifyVoiceSessionListeners();
      let sessionClient: ReturnType<typeof getTRPCClient> | undefined;
      const isCurrentProviderSession = () =>
        sessionGeneration === sessionGenerationRef.current &&
        currentVoiceChannelIdRef.current === channelId &&
        voiceSessionAttemptRef.current === sessionAttempt;
      const isCurrentSession = () => {
        if (!isCurrentProviderSession()) return false;
        if (!sessionClient) return true;
        try {
          return getTRPCClient() === sessionClient;
        } catch {
          return false;
        }
      };
      const assertCurrentSession = () => {
        if (!isCurrentSession()) throw new VoiceSessionCancelledError();
      };
      try {
        setLoading(true);
        setConnectionStatus(ConnectionStatus.CONNECTING);
        const trpc = getTRPCClient();
        sessionClient = trpc;
        sessionAttempt.client = trpc;
        await trpc.voice.updateState.mutate({
          voiceOnlyMode: savedVoiceOnlyModeRef.current
        });
        assertCurrentSession();

        routerRtpCapabilities.current = incomingRouterRtpCapabilities;

        const device = new Device();

        await device.load({
          routerRtpCapabilities: incomingRouterRtpCapabilities
        });
        assertCurrentSession();

        const loadedDevice = device as Device & {
          rtpCapabilities?: RtpCapabilities;
          recvRtpCapabilities?: RtpCapabilities;
        };

        const recvRtpCapabilities =
          loadedDevice.recvRtpCapabilities ?? loadedDevice.rtpCapabilities;

        if (!recvRtpCapabilities) {
          throw new Error('Failed to load device RTP capabilities');
        }

        deviceRtpCapabilities.current = recvRtpCapabilities;

        await createProducerTransport(device);
        assertCurrentSession();
        await createConsumerTransport(device);
        assertCurrentSession();
        await consumeExistingProducers(recvRtpCapabilities, {
          isViewingDemo: (userId) => isViewingDemoRef.current(userId)
        });
        assertCurrentSession();
        await startMicStream();
        assertCurrentSession();

        startMonitoring(producerTransport.current, consumerTransport.current);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setLoading(false);
        playSound(SoundType.OWN_USER_JOINED_VOICE_CHANNEL);
        assertCurrentSession();
        sessionAttempt.status = 'ready';
        notifyVoiceSessionListeners();
      } catch (error) {
        // A cancelled initializer must not tear down a newer session.
        if (!isCurrentSession()) {
          const cancellation = new VoiceSessionCancelledError();
          if (isCurrentProviderSession()) {
            cleanup();
            sessionAttempt.status = 'failed';
            sessionAttempt.error = cancellation;
            voiceSessionAttemptRef.current = sessionAttempt;
            notifyVoiceSessionListeners();
          }
          throw cancellation;
        }
        logVoiceError('session: init failed', error, { channelId });
        cleanup();

        setConnectionStatus(ConnectionStatus.FAILED);
        setLoading(false);
        sessionAttempt.status = 'failed';
        sessionAttempt.error = error;
        voiceSessionAttemptRef.current = sessionAttempt;
        notifyVoiceSessionListeners();

        throw error;
      }
    },
    [
      cleanup,
      createProducerTransport,
      createConsumerTransport,
      consumeExistingProducers,
      startMicStream,
      startMonitoring,
      producerTransport,
      consumerTransport,
      sessionGenerationRef,
      notifyVoiceSessionListeners
    ]
  );

  const waitForReadyVoiceSession = useCallback(
    async (providerGeneration: number) => {
      while (true) {
        if (
          !voiceProviderLifetimeRef.current.mounted ||
          voiceProviderLifetimeRef.current.generation !== providerGeneration
        )
          return undefined;
        const channelId = currentVoiceChannelIdRef.current;
        if (channelId === undefined) return undefined;

        const attempt = voiceSessionAttemptRef.current;
        if (attempt?.channelId === channelId) {
          if (
            attempt.status === 'ready' &&
            attempt.generation === sessionGenerationRef.current
          ) {
            return attempt;
          }
          if (attempt.status === 'failed') {
            throw (
              attempt.error ?? new Error('Voice session initialization failed')
            );
          }
        }

        await new Promise<void>((resolve) => {
          const wake = () => {
            voiceSessionListenersRef.current.delete(wake);
            resolve();
          };
          voiceSessionListenersRef.current.add(wake);
        });
      }
    },
    [sessionGenerationRef]
  );

  const setVoiceOnlyMode = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const providerGeneration = voiceProviderLifetimeRef.current.generation;
      let previousSession: TVoiceSessionAttempt | undefined;
      let resyncCount = 0;

      while (true) {
        const session = await waitForReadyVoiceSession(providerGeneration);
        if (!session) return false;

        if (
          previousSession &&
          (previousSession.channelId !== session.channelId ||
            previousSession.generation !== session.generation)
        ) {
          if (resyncCount >= MAX_VOICE_SESSION_RESYNCS) {
            throw new Error(
              'Voice session changed before voice-only mode was confirmed'
            );
          }
          resyncCount += 1;
        }
        previousSession = session;

        const trpc = getTRPCClient();
        if (session.client !== trpc) {
          throw new Error(
            'Voice connection changed before voice-only mode was confirmed'
          );
        }
        const isCurrentSession = () =>
          voiceProviderLifetimeRef.current.mounted &&
          voiceProviderLifetimeRef.current.generation === providerGeneration &&
          voiceSessionAttemptRef.current === session &&
          session.client === trpc &&
          session.status === 'ready' &&
          session.generation === sessionGenerationRef.current &&
          currentVoiceChannelIdRef.current === session.channelId;
        const isCurrentRequest = () => {
          if (!isCurrentSession()) return false;
          try {
            return getTRPCClient() === trpc;
          } catch {
            return false;
          }
        };

        try {
          await trpc.voice.updateState.mutate({ voiceOnlyMode: enabled });
        } catch (error) {
          if (isCurrentRequest()) throw error;
          if (isCurrentSession()) {
            throw new Error(
              'Voice connection changed before voice-only mode was confirmed',
              {
                cause: error
              }
            );
          }
          continue;
        }

        if (isCurrentRequest()) {
          saveDevices((current) => ({ ...current, voiceOnlyMode: enabled }));
          return true;
        }
        if (isCurrentSession()) {
          throw new Error(
            'Voice connection changed before voice-only mode was confirmed'
          );
        }
      }
    },
    [saveDevices, waitForReadyVoiceSession, sessionGenerationRef]
  );

  const { toggleMic, toggleSound, toggleWebcam, toggleScreenShare } =
    useVoiceControls({
      voiceOnlyModeRef,
      startMicStream,
      localAudioStream,
      startWebcamStream,
      stopWebcamStream,
      startScreenShareStream,
      stopScreenShareStream
    });

  const setMicMutedForBridge = useCallback(
    async (muted: boolean) => {
      if (ownVoiceState.micMuted === muted) return;
      await toggleMic();
    },
    [ownVoiceState.micMuted, toggleMic]
  );

  const setSoundMutedForBridge = useCallback(
    async (muted: boolean) => {
      if (ownVoiceState.soundMuted === muted) return;
      await toggleSound();
    },
    [ownVoiceState.soundMuted, toggleSound]
  );

  useEffect(() => {
    setVoiceControlsBridge({
      setMicMuted: setMicMutedForBridge,
      setSoundMuted: setSoundMutedForBridge
    });

    return () => {
      clearVoiceControlsBridge();
    };
  }, [setMicMutedForBridge, setSoundMutedForBridge]);

  const previousConnectionStatus = useRef(connectionStatus);

  useEffect(() => {
    if (previousConnectionStatus.current === connectionStatus) return;

    logVoice('session: connection status changed', {
      from: previousConnectionStatus.current,
      to: connectionStatus
    });

    previousConnectionStatus.current = connectionStatus;
  }, [connectionStatus]);

  const getVoiceDebugSource = useCallback(
    () => ({
      producerTransport: producerTransport.current,
      consumerTransport: consumerTransport.current,
      producers: [
        { kind: StreamKind.AUDIO, producer: localAudioProducer.current },
        { kind: StreamKind.VIDEO, producer: localVideoProducer.current },
        { kind: StreamKind.SCREEN, producer: localScreenShareProducer.current },
        {
          kind: StreamKind.SCREEN_AUDIO,
          producer: localScreenShareAudioProducer.current
        }
      ],
      consumers: Object.entries(consumers.current).flatMap(
        ([remoteId, byKind]) =>
          Object.entries(byKind).map(([kind, consumer]) => ({
            remoteId: +remoteId,
            kind,
            consumer
          }))
      ),
      routerRtpCapabilities: routerRtpCapabilities.current,
      deviceRtpCapabilities: deviceRtpCapabilities.current
    }),
    [
      producerTransport,
      consumerTransport,
      consumers,
      localAudioProducer,
      localVideoProducer,
      localScreenShareProducer,
      localScreenShareAudioProducer
    ]
  );

  useEffect(
    () => registerVoiceDebugSource(getVoiceDebugSource),
    [getVoiceDebugSource]
  );
  useEffect(() => {
    const previousVoiceChannelId = previousVoiceChannelIdRef.current;

    previousVoiceChannelIdRef.current = currentVoiceChannelId;

    if (
      previousVoiceChannelId !== undefined &&
      currentVoiceChannelId === undefined
    ) {
      logVoice('session: left voice channel, releasing resources', {
        channelId: previousVoiceChannelId
      });
      cleanup();
    }
  }, [currentVoiceChannelId, cleanup]);

  useEffect(() => {
    const lifetime = voiceProviderLifetimeRef.current;
    lifetime.mounted = true;
    return () => {
      lifetime.mounted = false;
      lifetime.generation += 1;
      logVoice('session: provider unmounting');
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = useMemo<TVoiceProvider>(
    () => ({
      loading,
      connectionStatus,
      audioVideoRefsMap: audioVideoRefsMap.current,
      isScreenShareSupported,
      getOrCreateRefs,
      getConsumerCodec,
      getConsumer,
      consumeRef,
      rtpCapabilitiesRef: deviceRtpCapabilities,
      isViewingDemoRef,
      onRemoteDemoStoppedRef,
      voiceOnlyModeRef,
      canConsumeScreen,
      startReceivingDemo,
      stopReceivingDemo,
      rtpCapabilities:
        deviceRtpCapabilities.current ??
        routerRtpCapabilities.current ??
        undefined,
      getStreamQuality,
      getStreamQualityLayers,
      setStreamQuality,
      isSimulcastConsumer,
      init,
      setVoiceOnlyMode,

      toggleMic,
      toggleSound,
      toggleWebcam,
      toggleScreenShare,
      ownVoiceState,

      localAudioStream,
      localVideoStream,
      localScreenShareStream,
      localScreenShareAudioStream,

      remoteUserStreams,
      externalStreams,

      closeRemoteUserProducer,
      removeRemoteUserStream: removeRemoteUserStreamAndConsumer,
      removeExternalStreamTrack: removeExternalStreamTrackAndConsumer,
      removeExternalStream: removeExternalStreamAndConsumers,
      clearRemoteUserStreamsForUser: clearRemoteUserStreamsAndConsumersForUser
    }),
    [
      loading,
      connectionStatus,
      isScreenShareSupported,
      getOrCreateRefs,
      getConsumerCodec,
      getConsumer,
      canConsumeScreen,
      closeRemoteUserProducer,
      startReceivingDemo,
      stopReceivingDemo,
      consumeRef,
      getStreamQuality,
      getStreamQualityLayers,
      setStreamQuality,
      isSimulcastConsumer,
      init,
      setVoiceOnlyMode,

      toggleMic,
      toggleSound,
      toggleWebcam,
      toggleScreenShare,
      ownVoiceState,

      localAudioStream,
      localVideoStream,
      localScreenShareStream,
      localScreenShareAudioStream,
      remoteUserStreams,
      externalStreams,

      removeRemoteUserStreamAndConsumer,
      removeExternalStreamTrackAndConsumer,
      removeExternalStreamAndConsumers,
      clearRemoteUserStreamsAndConsumersForUser
    ]
  );

  const statsContextValue = useMemo(
    () => ({ stats: transportStats, subscribe: subscribeToStats }),
    [transportStats, subscribeToStats]
  );

  return (
    <VoiceProviderContext.Provider value={contextValue}>
      <VoiceStatsContext.Provider value={statsContextValue}>
        <VolumeControlProvider>
          <RemoteWebcamVisibilityProvider>
            <DemoVisibilityProvider>
              <div className="relative">{children}</div>
            </DemoVisibilityProvider>
          </RemoteWebcamVisibilityProvider>
        </VolumeControlProvider>
      </VoiceStatsContext.Provider>
    </VoiceProviderContext.Provider>
  );
});

export { VoiceProvider, VoiceProviderContext };
