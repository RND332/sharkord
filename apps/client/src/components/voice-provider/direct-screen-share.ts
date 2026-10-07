import {
  DIRECT_SCREEN_CONNECT_TIMEOUT_MS,
  DIRECT_SCREEN_ICE_GATHER_TIMEOUT_MS,
  StreamKind,
  type TDirectScreenEvent,
  type TDirectScreenSession,
  type TDirectScreenSignal
} from '@sharkord/shared';

type TScreenKind = StreamKind.SCREEN | StreamKind.SCREEN_AUDIO;
type TDirectScreenStatus = 'idle' | 'connecting' | 'direct' | 'relayed';
type TTimerHandle = number | NodeJS.Timeout;

type TDirectScreenCallbacks = {
  prepare: () => Promise<TDirectScreenSession | null>;
  send: (sessionId: string, signal: TDirectScreenSignal) => Promise<void>;
  onStream: (userId: number, stream: MediaStream, kind: TScreenKind) => void;
  onRemoveStream: (
    userId: number,
    kind: TScreenKind,
    stream: MediaStream
  ) => void;
  onStatus: (status: TDirectScreenStatus) => void;
  onError: (error: unknown) => void;
};

type TDirectScreenOptions = {
  maxBitrate: number;
  codec?: string;
  onFallback: () => Promise<void>;
};

type TOutgoingAttempt = {
  controller: AbortController;
  timer: TTimerHandle;
  resolve: (connected: boolean) => void;
  settled: boolean;
  established: boolean;
  onFallback: () => Promise<void>;
  sessionId?: string;
  peer?: TDirectPeer;
};

type TDirectPeer = {
  sessionId: string;
  peerId: number;
  channelId?: number;
  senderId?: number;
  connection: RTCPeerConnection;
  controller: AbortController;
  direction: 'incoming' | 'outgoing';
  phase: 'offering' | 'offered' | 'answering' | 'answered';
  ready: boolean;
  readySending: boolean;
  streams: Map<TScreenKind, MediaStream>;
  timer?: TTimerHandle;
  outgoing?: TOutgoingAttempt;
};

export class DirectScreenShare {
  private callbacks: TDirectScreenCallbacks;
  private peers = new Map<string, TDirectPeer>();
  private retiredSessions = new Set<string>();
  private outgoing?: TOutgoingAttempt;

  constructor(callbacks: TDirectScreenCallbacks) {
    this.callbacks = callbacks;
  }

  start = (
    stream: MediaStream,
    options: TDirectScreenOptions
  ): Promise<boolean> => {
    this.stop();

    return new Promise<boolean>((resolve) => {
      const attempt: TOutgoingAttempt = {
        controller: new AbortController(),
        timer: setTimeout(() => {
          this.failOutgoing(attempt);
        }, DIRECT_SCREEN_CONNECT_TIMEOUT_MS),
        resolve,
        settled: false,
        established: false,
        onFallback: options.onFallback
      };
      this.outgoing = attempt;
      this.callbacks.onStatus('connecting');
      this.prepareOutgoing(attempt, stream, options).catch((error: unknown) => {
        if (this.isCurrentAttempt(attempt)) this.failOutgoing(attempt, error);
      });
    });
  };

  handleSignal = async (event: TDirectScreenEvent): Promise<void> => {
    if (this.retiredSessions.has(event.sessionId)) return;
    const peer = this.peers.get(event.sessionId);

    if (!peer) {
      if (
        event.signal.type === 'offer' &&
        event.fromUserId === event.senderId
      ) {
        await this.receiveOffer(event);
      } else if (
        event.signal.type === 'fallback' ||
        event.signal.type === 'stop'
      ) {
        // terminal events can overtake the prepare RPC response or an offer.
        this.retiredSessions.add(event.sessionId);
      }
      return;
    }

    if (!this.matchesPeer(peer, event)) return;
    const { signal } = event;
    if (signal.type === 'fallback' || signal.type === 'stop') {
      this.pinIdentity(peer, event);
      this.failPeer(peer, undefined, false);
      return;
    }
    if (peer.direction !== 'outgoing') return;

    if (signal.type === 'answer' && peer.phase === 'offered') {
      this.pinIdentity(peer, event);
      peer.phase = 'answering';
      try {
        await peer.connection.setRemoteDescription({
          type: 'answer',
          sdp: signal.sdp
        });
        if (!this.isActivePeer(peer)) return;
        peer.phase = 'answered';
        this.completeOutgoing(peer);
      } catch (error) {
        if (this.isActivePeer(peer)) this.failPeer(peer, error);
      }
    } else if (
      signal.type === 'ready' &&
      (peer.phase === 'answering' || peer.phase === 'answered')
    ) {
      this.pinIdentity(peer, event);
      peer.ready = true;
      this.completeOutgoing(peer);
    }
  };

  stop = (): void => {
    const attempt = this.outgoing;
    if (!attempt) return;
    this.outgoing = undefined;
    clearTimeout(attempt.timer);
    attempt.controller.abort();
    this.resolveAttempt(attempt, false);
    if (attempt.peer) this.retirePeer(attempt.peer);
    if (attempt.sessionId) {
      this.retiredSessions.add(attempt.sessionId);
      this.sendBestEffort(attempt.sessionId, { type: 'stop' });
    }
    this.callbacks.onStatus('idle');
  };

  close = (): void => {
    this.stop();
    for (const peer of this.peers.values()) {
      this.retirePeer(peer);
      this.sendBestEffort(peer.sessionId, { type: 'stop' });
    }
  };

  private prepareOutgoing = async (
    attempt: TOutgoingAttempt,
    stream: MediaStream,
    options: TDirectScreenOptions
  ): Promise<void> => {
    const session = await this.callbacks.prepare();
    if (!this.isCurrentAttempt(attempt)) {
      if (session) this.sendBestEffort(session.sessionId, { type: 'stop' });
      return;
    }
    if (!session || this.retiredSessions.has(session.sessionId)) {
      if (session) this.sendBestEffort(session.sessionId, { type: 'stop' });
      this.failOutgoing(attempt);
      return;
    }

    attempt.sessionId = session.sessionId;
    const connection = new RTCPeerConnection({
      iceServers: session.stunUrls.length ? [{ urls: session.stunUrls }] : []
    });
    const peer: TDirectPeer = {
      sessionId: session.sessionId,
      peerId: session.peerId,
      connection,
      controller: attempt.controller,
      direction: 'outgoing',
      phase: 'offering',
      ready: false,
      readySending: false,
      streams: new Map(),
      outgoing: attempt
    };
    attempt.peer = peer;
    this.peers.set(peer.sessionId, peer);
    this.listenForConnection(peer);

    const video = stream.getVideoTracks()[0];
    if (!video) throw new Error('direct screen capture has no video track');
    const transceiver = connection.addTransceiver(video, {
      direction: 'sendonly',
      streams: [stream],
      sendEncodings: [{ maxBitrate: options.maxBitrate }]
    });
    this.preferCodec(transceiver, options.codec);
    const audio = stream.getAudioTracks()[0];
    if (audio) {
      connection.addTransceiver(audio, {
        direction: 'sendonly',
        streams: [stream]
      });
    }

    const offer = await connection.createOffer();
    if (!this.isActivePeer(peer)) return;
    await connection.setLocalDescription(offer);
    if (!this.isActivePeer(peer)) return;
    await this.gatherIce(peer);
    if (!this.isActivePeer(peer)) return;
    const sdp = connection.localDescription?.sdp;
    if (!sdp) throw new Error('direct screen offer has no local SDP');

    // an answer can arrive through the subscription before the send RPC returns.
    peer.phase = 'offered';
    await this.callbacks.send(peer.sessionId, { type: 'offer', sdp });
  };

  private receiveOffer = async (event: TDirectScreenEvent): Promise<void> => {
    if (event.signal.type !== 'offer') return;
    let peer: TDirectPeer | undefined;
    try {
      const connection = new RTCPeerConnection({
        iceServers: event.stunUrls.length ? [{ urls: event.stunUrls }] : []
      });
      peer = {
        sessionId: event.sessionId,
        peerId: event.senderId,
        channelId: event.channelId,
        senderId: event.senderId,
        connection,
        controller: new AbortController(),
        direction: 'incoming',
        phase: 'answering',
        ready: false,
        readySending: false,
        streams: new Map()
      };
      for (const previous of this.peers.values()) {
        if (
          previous.direction === 'incoming' &&
          previous.peerId === peer.peerId
        ) {
          this.retirePeer(previous);
          this.sendBestEffort(previous.sessionId, { type: 'stop' });
        }
      }
      this.peers.set(peer.sessionId, peer);
      const incoming = peer;
      peer.timer = setTimeout(() => {
        this.failPeer(incoming);
      }, DIRECT_SCREEN_CONNECT_TIMEOUT_MS);
      this.listenForConnection(peer);
      connection.addEventListener(
        'track',
        (trackEvent) => {
          this.receiveTrack(incoming, trackEvent.track);
        },
        { signal: peer.controller.signal }
      );

      await connection.setRemoteDescription({
        type: 'offer',
        sdp: event.signal.sdp
      });
      if (!this.isActivePeer(peer)) return;
      const answer = await connection.createAnswer();
      if (!this.isActivePeer(peer)) return;
      await connection.setLocalDescription(answer);
      if (!this.isActivePeer(peer)) return;
      await this.gatherIce(peer);
      if (!this.isActivePeer(peer)) return;
      const sdp = connection.localDescription?.sdp;
      if (!sdp) throw new Error('direct screen answer has no local SDP');
      await this.callbacks.send(peer.sessionId, { type: 'answer', sdp });
      if (!this.isActivePeer(peer)) return;
      peer.phase = 'answered';
      this.readyIncoming(peer);
    } catch (error) {
      if (peer) {
        if (this.isActivePeer(peer)) this.failPeer(peer, error);
      } else {
        this.retiredSessions.add(event.sessionId);
        this.callbacks.onError(error);
        this.sendBestEffort(event.sessionId, { type: 'fallback' });
      }
    }
  };

  private preferCodec = (
    transceiver: RTCRtpTransceiver,
    codec?: string
  ): void => {
    if (
      !codec ||
      typeof transceiver.setCodecPreferences !== 'function' ||
      typeof RTCRtpReceiver === 'undefined' ||
      typeof RTCRtpReceiver.getCapabilities !== 'function'
    ) {
      return;
    }
    const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs;
    if (
      !codecs?.some(
        (supported) => supported.mimeType.toLowerCase() === codec.toLowerCase()
      )
    ) {
      return;
    }
    const preferred = codec.toLowerCase();
    transceiver.setCodecPreferences(
      [...codecs].sort((left, right) => {
        return (
          Number(right.mimeType.toLowerCase() === preferred) -
          Number(left.mimeType.toLowerCase() === preferred)
        );
      })
    );
  };

  private gatherIce = (peer: TDirectPeer): Promise<void> => {
    const { connection, controller } = peer;
    if (
      connection.iceGatheringState === 'complete' ||
      controller.signal.aborted
    ) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        connection.removeEventListener('icegatheringstatechange', onGathering);
        controller.signal.removeEventListener('abort', finish);
        resolve();
      };
      const onGathering = () => {
        if (connection.iceGatheringState === 'complete') finish();
      };
      const timer = setTimeout(finish, DIRECT_SCREEN_ICE_GATHER_TIMEOUT_MS);
      connection.addEventListener('icegatheringstatechange', onGathering);
      controller.signal.addEventListener('abort', finish, { once: true });
      onGathering();
    });
  };

  private listenForConnection = (peer: TDirectPeer): void => {
    peer.connection.addEventListener(
      'connectionstatechange',
      () => {
        if (!this.isActivePeer(peer)) return;
        switch (peer.connection.connectionState) {
          case 'connected':
            if (peer.direction === 'outgoing') this.completeOutgoing(peer);
            else this.readyIncoming(peer);
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            this.failPeer(peer);
            break;
        }
      },
      { signal: peer.controller.signal }
    );
  };

  private receiveTrack = (peer: TDirectPeer, track: MediaStreamTrack): void => {
    if (!this.isActivePeer(peer)) return;
    let kind: TScreenKind;
    if (track.kind === 'video') kind = StreamKind.SCREEN;
    else if (track.kind === 'audio') kind = StreamKind.SCREEN_AUDIO;
    else return;
    if (peer.streams.has(kind)) return;
    try {
      const stream = new MediaStream([track]);
      peer.streams.set(kind, stream);
      this.callbacks.onStream(peer.peerId, stream, kind);
      this.readyIncoming(peer);
    } catch (error) {
      this.failPeer(peer, error);
    }
  };

  private readyIncoming = (peer: TDirectPeer): void => {
    if (
      !this.isActivePeer(peer) ||
      peer.phase !== 'answered' ||
      peer.readySending ||
      peer.connection.connectionState !== 'connected' ||
      !peer.streams.has(StreamKind.SCREEN)
    ) {
      return;
    }
    peer.readySending = true;
    this.callbacks
      .send(peer.sessionId, { type: 'ready' })
      .then(() => {
        if (!this.isActivePeer(peer)) return;
        peer.ready = true;
        clearTimeout(peer.timer);
        peer.timer = undefined;
      })
      .catch((error: unknown) => {
        if (this.isActivePeer(peer)) this.failPeer(peer, error);
      });
  };

  private completeOutgoing = (peer: TDirectPeer): void => {
    const attempt = peer.outgoing;
    if (
      !attempt ||
      !this.isActivePeer(peer) ||
      attempt.established ||
      peer.phase !== 'answered' ||
      !peer.ready ||
      peer.connection.connectionState !== 'connected'
    ) {
      return;
    }
    attempt.established = true;
    clearTimeout(attempt.timer);
    this.callbacks.onStatus('direct');
    this.resolveAttempt(attempt, true);
  };

  private matchesPeer = (
    peer: TDirectPeer,
    event: TDirectScreenEvent
  ): boolean => {
    return (
      this.isActivePeer(peer) &&
      event.fromUserId === peer.peerId &&
      (peer.channelId === undefined || event.channelId === peer.channelId) &&
      (peer.senderId === undefined || event.senderId === peer.senderId) &&
      (peer.direction !== 'outgoing' || event.senderId !== peer.peerId)
    );
  };

  private pinIdentity = (
    peer: TDirectPeer,
    event: TDirectScreenEvent
  ): void => {
    peer.channelId = event.channelId;
    peer.senderId = event.senderId;
  };

  private isCurrentAttempt = (attempt: TOutgoingAttempt): boolean => {
    return this.outgoing === attempt && !attempt.controller.signal.aborted;
  };

  private isActivePeer = (peer: TDirectPeer): boolean => {
    return (
      this.peers.get(peer.sessionId) === peer && !peer.controller.signal.aborted
    );
  };

  private resolveAttempt = (
    attempt: TOutgoingAttempt,
    connected: boolean
  ): void => {
    if (attempt.settled) return;
    attempt.settled = true;
    attempt.resolve(connected);
  };

  private failPeer = (
    peer: TDirectPeer,
    error?: unknown,
    notify = true
  ): void => {
    if (!this.isActivePeer(peer)) return;
    if (peer.outgoing) {
      this.failOutgoing(peer.outgoing, error, notify);
      return;
    }
    this.retirePeer(peer);
    if (error !== undefined) this.callbacks.onError(error);
    if (notify) this.sendBestEffort(peer.sessionId, { type: 'fallback' });
  };

  private failOutgoing = (
    attempt: TOutgoingAttempt,
    error?: unknown,
    notify = true
  ): void => {
    if (!this.isCurrentAttempt(attempt)) return;
    this.outgoing = undefined;
    clearTimeout(attempt.timer);
    attempt.controller.abort();
    if (attempt.peer) this.retirePeer(attempt.peer);
    if (attempt.sessionId) {
      this.retiredSessions.add(attempt.sessionId);
      if (notify) this.sendBestEffort(attempt.sessionId, { type: 'fallback' });
    }
    this.resolveAttempt(attempt, false);
    this.callbacks.onStatus('relayed');
    if (error !== undefined) this.callbacks.onError(error);
    if (attempt.established) {
      Promise.resolve()
        .then(attempt.onFallback)
        .catch((fallbackError: unknown) => {
          this.callbacks.onError(fallbackError);
        });
    }
  };

  private retirePeer = (peer: TDirectPeer): void => {
    if (this.peers.get(peer.sessionId) !== peer) return;
    this.peers.delete(peer.sessionId);
    this.retiredSessions.add(peer.sessionId);
    clearTimeout(peer.timer);
    peer.controller.abort();
    peer.connection.close();
    for (const [kind, stream] of peer.streams) {
      this.callbacks.onRemoveStream(peer.peerId, kind, stream);
    }
    peer.streams.clear();
  };

  private sendBestEffort = (
    sessionId: string,
    signal: TDirectScreenSignal
  ): void => {
    Promise.resolve()
      .then(() => this.callbacks.send(sessionId, signal))
      .catch((error: unknown) => {
        this.callbacks.onError(error);
      });
  };
}
