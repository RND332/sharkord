import {
  logVoice,
  logVoiceError,
  logVoiceWarn
} from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import {
  type ConsumerType,
  getMediasoupKind,
  StreamKind,
  type TProducibleStreamKind,
  type TStreamQualityLayer
} from '@sharkord/shared';
import { TRPCClientError } from '@trpc/client';
import {
  type AppData,
  type Consumer,
  type Device,
  type RtpCapabilities,
  type Transport
} from 'mediasoup-client/types';
import { useCallback, useEffect, useRef } from 'react';
import { getStoredStreamQuality } from '../helpers';

type TUseTransportParams = {
  voiceOnlyMode: boolean;
  canConsumeScreen: (userId: number) => boolean;
  addRemoteUserStream: (
    userId: number,
    stream: MediaStream,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  addExternalStreamTrack: (
    streamId: number,
    stream: MediaStream,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  setRemoteConsumerType: (
    remoteId: number,
    kind: StreamKind,
    consumerType: ConsumerType | undefined
  ) => void;
  setRemoteStreamQualityLayers: (
    remoteId: number,
    kind: StreamKind,
    layers: TStreamQualityLayer[]
  ) => void;
  clearRemoteConsumerMetadata: () => void;
};

const useTransports = ({
  voiceOnlyMode,
  canConsumeScreen,
  addRemoteUserStream,
  removeRemoteUserStream,
  addExternalStreamTrack,
  removeExternalStreamTrack,
  setRemoteConsumerType,
  setRemoteStreamQualityLayers,
  clearRemoteConsumerMetadata
}: TUseTransportParams) => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});
  const consumerCodecs = useRef<Map<string, string>>(new Map());
  const consumeOperationsInProgress = useRef<Map<string, Promise<void>>>(
    new Map()
  );
  const voiceOnlyModeRef = useRef(voiceOnlyMode);
  const nonVoiceGenerationRef = useRef(0);
  if (voiceOnlyModeRef.current !== voiceOnlyMode) {
    voiceOnlyModeRef.current = voiceOnlyMode;
    nonVoiceGenerationRef.current++;
    for (const key of consumeOperationsInProgress.current.keys()) {
      if (key.slice(key.indexOf('-') + 1) !== StreamKind.AUDIO) {
        consumeOperationsInProgress.current.delete(key);
      }
    }
  }

  useEffect(() => {
    if (!voiceOnlyMode) return;
    for (const [remoteId, userConsumers] of Object.entries(consumers.current)) {
      for (const [kind, consumer] of Object.entries(userConsumers)) {
        if (kind === StreamKind.AUDIO) continue;
        consumer.close();
        delete userConsumers[kind];
        consumerCodecs.current.delete(`${remoteId}-${kind}`);
        setRemoteConsumerType(+remoteId, kind as StreamKind, undefined);
        setRemoteStreamQualityLayers(+remoteId, kind as StreamKind, []);
        if (
          kind === StreamKind.EXTERNAL_AUDIO ||
          kind === StreamKind.EXTERNAL_VIDEO
        ) {
          removeExternalStreamTrack(+remoteId, kind);
        } else {
          removeRemoteUserStream(+remoteId, kind as TRemoteUserStreamKinds);
        }
      }
    }
  }, [
    voiceOnlyMode,
    removeExternalStreamTrack,
    removeRemoteUserStream,
    setRemoteConsumerType,
    setRemoteStreamQualityLayers
  ]);

  const createProducerTransport = useCallback(async (device: Device) => {
    logVoice('producer transport: creating');

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createProducerTransport.mutate();

      logVoice('producer transport: created', {
        transportId: params.id,
        iceCandidates: params.iceCandidates.length
      });

      producerTransport.current = device.createSendTransport(params);

      producerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          logVoice('producer transport: dtls connect requested', {
            role: dtlsParameters.role
          });

          try {
            await trpc.voice.connectProducerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            logVoiceError('producer transport: dtls connect failed', error);
          }
        }
      );

      producerTransport.current.on('connectionstatechange', (state) => {
        logVoice('producer transport: connection state changed', { state });

        if (state === 'failed') {
          logVoiceError(
            'producer transport: ice failed, closing',
            new Error(`connection state ${state}`)
          );
          producerTransport.current?.close();
        } else if (state === 'closed') {
          logVoice('producer transport: closed');
          producerTransport.current = undefined;
        }
      });

      producerTransport.current.on('icecandidateerror', (error) => {
        logVoiceWarn('producer transport: ice candidate error', {
          address: error.address,
          port: error.port,
          errorCode: error.errorCode,
          errorText: error.errorText
        });
      });

      producerTransport.current.on(
        'produce',
        async ({ rtpParameters, appData }, callback, errback) => {
          logVoice('producer transport: producing track', {
            kind: (appData as { kind: StreamKind }).kind,
            codec: rtpParameters.codecs[0]?.mimeType,
            encodings: rtpParameters.encodings?.length ?? 0
          });

          const { kind, qualityLayers } = appData as {
            kind: TProducibleStreamKind;
            qualityLayers?: TStreamQualityLayer[];
          };

          if (!producerTransport.current) return;

          try {
            if (kind !== StreamKind.AUDIO && voiceOnlyModeRef.current) {
              throw new Error('Voice-only mode does not allow this media');
            }
            const generation = nonVoiceGenerationRef.current;
            const producerId = await trpc.voice.produce.mutate({
              transportId: producerTransport.current.id,
              kind,
              rtpParameters,
              qualityLayers
            });
            if (
              kind !== StreamKind.AUDIO &&
              (voiceOnlyModeRef.current ||
                generation !== nonVoiceGenerationRef.current)
            ) {
              await trpc.voice.closeProducer.mutate({ kind, producerId });
              throw new Error('Voice-only mode does not allow this media');
            }

            logVoice('producer transport: track produced', {
              kind,
              producerId
            });

            callback({ id: producerId });
          } catch (error) {
            if (error instanceof TRPCClientError) {
              if (error.data.code === 'FORBIDDEN') {
                logVoiceWarn('producer transport: produce denied', { kind });
                errback(
                  new Error(
                    `You don't have permission to ${kind} in this channel`
                  )
                );

                return;
              }
            }

            logVoiceError('producer transport: produce failed', error, {
              kind
            });
            errback(error as Error);
          }
        }
      );
    } catch (error) {
      logVoiceError('producer transport: create failed', error);
    }
  }, []);

  const createConsumerTransport = useCallback(async (device: Device) => {
    logVoice('consumer transport: creating');

    const trpc = getTRPCClient();

    try {
      const params = await trpc.voice.createConsumerTransport.mutate();

      logVoice('consumer transport: created', {
        transportId: params.id,
        iceCandidates: params.iceCandidates.length
      });

      consumerTransport.current = device.createRecvTransport(params);

      consumerTransport.current.on(
        'connect',
        async ({ dtlsParameters }, callback, errback) => {
          logVoice('consumer transport: dtls connect requested', {
            role: dtlsParameters.role
          });

          try {
            await trpc.voice.connectConsumerTransport.mutate({
              dtlsParameters
            });

            callback();
          } catch (error) {
            errback(error as Error);
            logVoiceError('consumer transport: dtls connect failed', error);
          }
        }
      );

      consumerTransport.current.on('connectionstatechange', (state) => {
        logVoice('consumer transport: connection state changed', { state });

        if (state === 'failed') {
          logVoiceError(
            'consumer transport: ice failed, closing',
            new Error(`connection state ${state}`)
          );

          Object.values(consumers.current).forEach((userConsumers) => {
            Object.values(userConsumers).forEach((consumer) => {
              consumer.close();
            });
          });
          consumers.current = {};

          consumerTransport.current?.close();
          consumerTransport.current = undefined;
        } else if (state === 'closed') {
          logVoice('consumer transport: closed');
          consumerTransport.current = undefined;
        }
      });

      consumerTransport.current.on('icecandidateerror', (error) => {
        logVoiceWarn('consumer transport: ice candidate error', {
          address: error.address,
          port: error.port,
          errorCode: error.errorCode,
          errorText: error.errorText
        });
      });
    } catch (error) {
      logVoiceError('consumer transport: create failed', error);
    }
  }, []);

  const pauseDemoConsumers = useCallback(
    async (remoteId: number): Promise<void> => {
      const trpc = getTRPCClient();
      const transport = consumerTransport.current;
      const generation = nonVoiceGenerationRef.current;
      const pending: Promise<void>[] = [];
      for (const kind of [
        StreamKind.SCREEN,
        StreamKind.SCREEN_AUDIO
      ] as const) {
        const consumer = consumers.current[remoteId]?.[kind];
        if (!consumer || consumer.closed) continue;
        consumer.pause();

        const operationKey = `${remoteId}-${kind}`;
        const pendingOperation =
          consumeOperationsInProgress.current.get(operationKey);
        const operation: Promise<void> = Promise.resolve().then(async () => {
          try {
            if (pendingOperation) {
              await pendingOperation.catch(() => undefined);
            }
            if (
              !transport ||
              transport !== consumerTransport.current ||
              transport.closed ||
              voiceOnlyModeRef.current ||
              generation !== nonVoiceGenerationRef.current ||
              canConsumeScreen(remoteId) ||
              consumer.closed ||
              consumers.current[remoteId]?.[kind] !== consumer
            ) {
              return;
            }
            await trpc.voice.pauseConsumer.mutate({ remoteId, kind });
          } finally {
            if (
              consumeOperationsInProgress.current.get(operationKey) ===
              operation
            ) {
              consumeOperationsInProgress.current.delete(operationKey);
            }
          }
        });
        consumeOperationsInProgress.current.set(operationKey, operation);
        pending.push(operation);
      }
      await Promise.all(pending);
    },
    [canConsumeScreen]
  );

  const consume = useCallback(
    async (
      remoteId: number,
      kind: StreamKind,
      rtpCapabilities: RtpCapabilities
    ): Promise<void> => {
      if (kind !== StreamKind.AUDIO && voiceOnlyModeRef.current) return;
      const isScreen =
        kind === StreamKind.SCREEN || kind === StreamKind.SCREEN_AUDIO;
      if (isScreen && !canConsumeScreen(remoteId)) return;
      const transport = consumerTransport.current;
      const generation = nonVoiceGenerationRef.current;
      if (!transport || transport.closed) {
        logVoiceWarn('consumer: skipped, no consumer transport', {
          remoteId,
          kind
        });
        return;
      }

      const operationKey = `${remoteId}-${kind}`;
      const pendingOperation =
        consumeOperationsInProgress.current.get(operationKey);

      if (pendingOperation) {
        if (!isScreen) {
          logVoiceWarn('consumer: skipped, consume already in progress', {
            remoteId,
            kind
          });
          return;
        }
        await pendingOperation.catch(() => undefined);
        if (
          transport === consumerTransport.current &&
          !transport.closed &&
          generation === nonVoiceGenerationRef.current &&
          !voiceOnlyModeRef.current &&
          canConsumeScreen(remoteId)
        ) {
          return consumeRef.current(remoteId, kind, rtpCapabilities);
        }
        return;
      }

      const operation: Promise<void> = Promise.resolve().then(async () => {
        // a queued screen pause replaces the map's tail, not the running work.
        const isCurrent = () =>
          transport === consumerTransport.current &&
          !transport.closed &&
          (isScreen ||
            consumeOperationsInProgress.current.get(operationKey) ===
              operation) &&
          (kind === StreamKind.AUDIO ||
            (!voiceOnlyModeRef.current &&
              generation === nonVoiceGenerationRef.current));
        const canContinue = () =>
          isCurrent() && (!isScreen || canConsumeScreen(remoteId));

        try {
          if (!canContinue()) return;
          logVoice('consumer: consuming', { remoteId, kind });

          const trpc = getTRPCClient();
          const existing = consumers.current[remoteId]?.[kind];
          if (
            isScreen &&
            existing &&
            !existing.closed &&
            existing.track.readyState === 'live'
          ) {
            if (!existing.paused) return;
            await trpc.voice.resumeConsumer.mutate({ remoteId, kind });
            if (
              canContinue() &&
              existing.track.readyState === 'live' &&
              consumers.current[remoteId]?.[kind] === existing
            ) {
              existing.resume();
            } else if (
              isCurrent() &&
              !existing.closed &&
              consumers.current[remoteId]?.[kind] === existing &&
              !canConsumeScreen(remoteId)
            ) {
              existing.pause();
              await trpc.voice.pauseConsumer.mutate({ remoteId, kind });
            }
            return;
          }

          const {
            producerId,
            consumerId,
            consumerKind,
            consumerRtpParameters,
            consumerType,
            qualityLayers
          } = await trpc.voice.consume.mutate({
            kind,
            remoteId,
            rtpCapabilities
          });
          if (!canContinue()) {
            if (isScreen && isCurrent() && !canConsumeScreen(remoteId)) {
              await trpc.voice.pauseConsumer.mutate({ remoteId, kind });
            }
            return;
          }

          logVoice('consumer: parameters received', {
            remoteId,
            producerId,
            consumerId,
            consumerKind,
            consumerType,
            qualityLayers: qualityLayers.length
          });

          if (!consumers.current[remoteId]) {
            consumers.current[remoteId] = {};
          }

          const existingConsumer = consumers.current[remoteId][consumerKind];

          if (existingConsumer && !existingConsumer.closed) {
            logVoice('consumer: replacing existing consumer', {
              remoteId,
              kind
            });

            existingConsumer.close();
            delete consumers.current[remoteId][consumerKind];
          }

          const newConsumer = await transport.consume({
            id: consumerId,
            producerId: producerId,
            kind: getMediasoupKind(consumerKind),
            rtpParameters: consumerRtpParameters
          });
          if (!canContinue()) {
            newConsumer.close();
            if (isScreen && isCurrent() && !canConsumeScreen(remoteId)) {
              await trpc.voice.pauseConsumer.mutate({ remoteId, kind });
            }
            return;
          }

          logVoice('consumer: created', {
            remoteId,
            kind,
            consumerId: newConsumer.id,
            codec: newConsumer.rtpParameters.codecs[0]?.mimeType
          });

          const cleanupEvents = [
            'transportclose',
            'trackended',
            '@close',
            'close'
          ];

          cleanupEvents.forEach((event) => {
            // @ts-expect-error - YOLO
            newConsumer?.on(event, () => {
              logVoice('consumer: cleanup event', { event, remoteId, kind });
              if (consumers.current[remoteId]?.[consumerKind] !== newConsumer)
                return;

              if (
                kind === StreamKind.EXTERNAL_VIDEO ||
                kind === StreamKind.EXTERNAL_AUDIO
              ) {
                removeExternalStreamTrack(remoteId, kind);
              } else {
                removeRemoteUserStream(remoteId, kind);
              }

              if (consumers.current[remoteId]?.[consumerKind]) {
                delete consumers.current[remoteId][consumerKind];
              }

              consumerCodecs.current.delete(`${remoteId}-${kind}`);

              setRemoteConsumerType(remoteId, kind, undefined);
              setRemoteStreamQualityLayers(remoteId, kind, []);
            });
          });

          consumers.current[remoteId][consumerKind] = newConsumer;

          setRemoteConsumerType(remoteId, kind, consumerType);
          setRemoteStreamQualityLayers(remoteId, kind, qualityLayers);

          const codecKey = `${remoteId}-${kind}`;

          const negotiatedCodec =
            newConsumer.rtpParameters?.codecs?.[0]?.mimeType;

          if (negotiatedCodec) {
            consumerCodecs.current.set(codecKey, negotiatedCodec);
          }

          if (
            consumerType === 'simulcast' &&
            (kind === StreamKind.VIDEO ||
              kind === StreamKind.SCREEN ||
              kind === StreamKind.EXTERNAL_VIDEO)
          ) {
            const quality = getStoredStreamQuality(
              remoteId,
              kind,
              qualityLayers
            );

            if (quality.mode === 'layer') {
              await trpc.voice.setConsumerQuality.mutate({
                remoteId,
                kind,
                quality
              });
            }
          }
          if (newConsumer.closed || !canContinue()) {
            newConsumer.close();
            if (isScreen && isCurrent() && !canConsumeScreen(remoteId)) {
              await trpc.voice.pauseConsumer.mutate({ remoteId, kind });
            }
            return;
          }

          const stream = new MediaStream();

          stream.addTrack(newConsumer.track);

          if (
            kind === StreamKind.EXTERNAL_VIDEO ||
            kind === StreamKind.EXTERNAL_AUDIO
          ) {
            addExternalStreamTrack(remoteId, stream, kind);
          } else {
            addRemoteUserStream(remoteId, stream, kind);
          }
        } catch (error) {
          logVoiceError('consumer: consume failed', error, { remoteId, kind });
        } finally {
          if (
            consumeOperationsInProgress.current.get(operationKey) === operation
          ) {
            consumeOperationsInProgress.current.delete(operationKey);
          }
        }
      });
      consumeOperationsInProgress.current.set(operationKey, operation);
      return operation;
    },
    [
      canConsumeScreen,
      addRemoteUserStream,
      removeRemoteUserStream,
      addExternalStreamTrack,
      removeExternalStreamTrack,
      setRemoteConsumerType,
      setRemoteStreamQualityLayers
    ]
  );

  // Stable ref pointing at the latest `consume` callback. Long-lived effects
  // (e.g. the pubsub subscription in `useVoiceEvents`) read `consume` through
  // this ref so they don't tear down and resubscribe every time `consume`
  // recreates due to upstream state changes (simulcast quality layers, etc.).
  const consumeRef = useRef(consume);

  consumeRef.current = consume;

  const getConsumer = useCallback(
    (remoteId: number, kind: StreamKind): Consumer<AppData> | undefined => {
      return consumers.current[remoteId]?.[kind];
    },
    []
  );

  const consumeExistingProducers = useCallback(
    async (
      rtpCapabilities: RtpCapabilities,
      options?: {
        externalStreamTracks?: {
          [streamId: number]: { audio?: boolean; video?: boolean };
        };
        // When provided, SCREEN / SCREEN_AUDIO producers for `remoteId` are
        // only consumed if `isViewingDemo(remoteId)` is true. Used to gate the
        // demo opt-in flow on channel-join.
        isViewingDemo?: (remoteId: number) => boolean;
      },
      includeMicrophones = true
    ) => {
      logVoice('session: consuming existing producers');

      const trpc = getTRPCClient();
      const transport = consumerTransport.current;
      const generation = nonVoiceGenerationRef.current;

      try {
        const {
          remoteAudioIds,
          remoteScreenIds,
          remoteScreenAudioIds,
          remoteVideoIds,
          remoteExternalStreamIds
        } = await trpc.voice.getProducers.query();
        if (
          !transport ||
          transport.closed ||
          transport !== consumerTransport.current
        ) {
          return;
        }

        logVoice('session: existing producers received', {
          remoteAudioIds,
          remoteVideoIds,
          remoteScreenIds,
          remoteScreenAudioIds,
          remoteExternalStreamIds
        });

        if (includeMicrophones) {
          remoteAudioIds.forEach((remoteId) => {
            consume(remoteId, StreamKind.AUDIO, rtpCapabilities);
          });
        }
        if (generation !== nonVoiceGenerationRef.current) return;

        remoteVideoIds.forEach((remoteId) => {
          consume(remoteId, StreamKind.VIDEO, rtpCapabilities);
        });

        remoteScreenIds.forEach((remoteId) => {
          if (options?.isViewingDemo && !options.isViewingDemo(remoteId))
            return;
          consume(remoteId, StreamKind.SCREEN, rtpCapabilities);
        });

        remoteScreenAudioIds.forEach((remoteId) => {
          if (options?.isViewingDemo && !options.isViewingDemo(remoteId))
            return;
          consume(remoteId, StreamKind.SCREEN_AUDIO, rtpCapabilities);
        });

        remoteExternalStreamIds.forEach((streamId: number) => {
          const tracks = options?.externalStreamTracks?.[streamId];

          if (tracks?.audio !== false) {
            consume(streamId, StreamKind.EXTERNAL_AUDIO, rtpCapabilities);
          }
          if (tracks?.video !== false) {
            consume(streamId, StreamKind.EXTERNAL_VIDEO, rtpCapabilities);
          }
        });
      } catch (error) {
        logVoiceError('session: consuming existing producers failed', error);
      }
    },
    [consume]
  );

  const getConsumerCodec = useCallback(
    (remoteId: number, kind: StreamKind): string | undefined => {
      return consumerCodecs.current.get(`${remoteId}-${kind}`);
    },
    []
  );

  const cleanupTransports = useCallback(() => {
    logVoice('session: cleaning up transports');
    nonVoiceGenerationRef.current++;

    Object.values(consumers.current).forEach((userConsumers) => {
      Object.values(userConsumers).forEach((consumer) => {
        if (!consumer.closed) {
          consumer.close();
        }
      });
    });

    consumers.current = {};
    consumerCodecs.current.clear();

    clearRemoteConsumerMetadata();

    consumeOperationsInProgress.current.clear();

    if (producerTransport.current && !producerTransport.current.closed) {
      producerTransport.current.close();
    }

    producerTransport.current = undefined;

    if (consumerTransport.current && !consumerTransport.current.closed) {
      consumerTransport.current.close();
    }

    consumerTransport.current = undefined;

    logVoice('session: transports cleanup complete');
  }, [clearRemoteConsumerMetadata]);

  return {
    producerTransport,
    consumerTransport,
    consumers,
    consumeRef,
    pauseDemoConsumers,
    createProducerTransport,
    createConsumerTransport,
    consume,
    consumeExistingProducers,
    cleanupTransports,
    getConsumer,
    getConsumerCodec
  };
};

export { useTransports };
