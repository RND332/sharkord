import {
  StreamKind,
  type TDirectScreenEvent,
  type TDirectScreenSession,
  type TDirectScreenSignal
} from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DirectScreenShare } from '../direct-screen-share';

// bun has no native RTC implementation; this double models native state and
// deferred operations, while browser verification covers SDP and actual media.
const OFFER = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
const ANSWER = 'v=0\r\no=- 2 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
const CANDIDATE = 'a=candidate:1 1 UDP 2122260223 192.0.2.1 5000 typ host\r\n';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  for (let index = 0; index < 30; index++) await Promise.resolve();
};

class TestClock {
  now = 0;
  nextId = 1;
  timers = new Map<number, { at: number; callback: () => void }>();

  setTimeout = (callback: () => void, delay = 0) => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.now + delay, callback });
    return id;
  };

  clearTimeout = (id: number) => {
    this.timers.delete(id);
  };

  advance = async (duration: number) => {
    const end = this.now + duration;
    while (true) {
      const next = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!next) break;
      this.now = next[1].at;
      this.timers.delete(next[0]);
      next[1].callback();
      await flush();
    }
    this.now = end;
    await flush();
  };
}

class TestTrack extends EventTarget {
  kind: string;
  stopped = 0;
  readyState = 'live';

  constructor(kind: string) {
    super();
    this.kind = kind;
  }

  stop = () => {
    this.stopped++;
    this.readyState = 'ended';
  };
}

class TestStream {
  tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  getTracks = () => [...this.tracks];
  getVideoTracks = () => this.tracks.filter((track) => track.kind === 'video');
  getAudioTracks = () => this.tracks.filter((track) => track.kind === 'audio');
}

type TPeerPlan = {
  offer?: Promise<void>;
  answer?: Promise<void>;
  remote?: Promise<void>;
  local?: Promise<void>;
  gathering?: boolean;
};

class TestPeer extends EventTarget {
  static instances: TestPeer[] = [];
  static plans: TPeerPlan[] = [];
  configuration: RTCConfiguration;
  plan: TPeerPlan;
  connectionState: RTCPeerConnectionState = 'new';
  iceGatheringState: RTCIceGatheringState = 'new';
  signalingState: RTCSignalingState = 'stable';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  transceivers: {
    track: MediaStreamTrack;
    init: RTCRtpTransceiverInit;
    codecs: RTCRtpCodec[];
  }[] = [];
  closeCount = 0;

  constructor(configuration: RTCConfiguration) {
    super();
    if (
      configuration.iceServers?.some(
        ({ urls }) => Array.isArray(urls) && !urls.length
      )
    ) {
      throw new DOMException(
        'ICE server parsing failed: Empty uri.',
        'SyntaxError'
      );
    }
    this.configuration = configuration;
    this.plan = TestPeer.plans.shift() ?? {};
    TestPeer.instances.push(this);
  }

  assertOpen = () => {
    if (this.connectionState === 'closed') throw new Error('peer is closed');
  };

  addTransceiver = (track: MediaStreamTrack, init: RTCRtpTransceiverInit) => {
    this.assertOpen();
    const entry = { track, init, codecs: [] as RTCRtpCodec[] };
    this.transceivers.push(entry);
    return {
      setCodecPreferences: (codecs: RTCRtpCodec[]) => {
        entry.codecs = codecs;
      }
    };
  };

  createOffer = async () => {
    this.assertOpen();
    if (!this.transceivers.length) throw new Error('no send transceivers');
    await this.plan.offer;
    return { type: 'offer', sdp: OFFER } as RTCSessionDescriptionInit;
  };

  createAnswer = async () => {
    this.assertOpen();
    if (this.remoteDescription?.type !== 'offer') {
      throw new Error('answer requires remote offer');
    }
    await this.plan.answer;
    return { type: 'answer', sdp: ANSWER } as RTCSessionDescriptionInit;
  };

  setLocalDescription = async (description: RTCSessionDescriptionInit) => {
    this.assertOpen();
    await this.plan.local;
    this.localDescription = description;
    this.signalingState =
      description.type === 'offer' ? 'have-local-offer' : 'stable';
    this.iceGatheringState = this.plan.gathering ? 'gathering' : 'complete';
    if (!this.plan.gathering) {
      this.localDescription = {
        ...description,
        sdp: description.sdp + CANDIDATE
      };
    }
  };

  setRemoteDescription = async (description: RTCSessionDescriptionInit) => {
    this.assertOpen();
    if (
      description.type === 'answer' &&
      this.signalingState !== 'have-local-offer'
    ) {
      throw new Error('answer requires local offer');
    }
    await this.plan.remote;
    this.remoteDescription = description;
    this.signalingState =
      description.type === 'offer' ? 'have-remote-offer' : 'stable';
  };

  gather = () => {
    this.iceGatheringState = 'complete';
    if (this.localDescription) {
      this.localDescription = {
        ...this.localDescription,
        sdp: this.localDescription.sdp + CANDIDATE
      };
    }
    this.dispatchEvent(new Event('icegatheringstatechange'));
  };

  connect = (state: RTCPeerConnectionState = 'connected') => {
    this.connectionState = state;
    this.dispatchEvent(new Event('connectionstatechange'));
  };

  receive = (track: MediaStreamTrack) => {
    const event = new Event('track');
    Object.defineProperties(event, {
      track: { value: track },
      streams: { value: [] }
    });
    this.dispatchEvent(event);
  };

  close = () => {
    this.closeCount++;
    this.connectionState = 'closed';
    this.signalingState = 'closed';
    this.dispatchEvent(new Event('connectionstatechange'));
  };
}

const session = (sessionId = 'outgoing'): TDirectScreenSession => ({
  sessionId,
  peerId: 2,
  stunUrls: ['stun:example.com:3478']
});

const event = (
  sessionId: string,
  signal: TDirectScreenSignal,
  incoming = false
): TDirectScreenEvent => ({
  sessionId,
  channelId: 10,
  senderId: incoming ? 2 : 1,
  fromUserId: 2,
  stunUrls: ['stun:example.com:3478'],
  signal
});

const capture = () => {
  const video = new TestTrack('video');
  const audio = new TestTrack('audio');
  const stream = new TestStream([
    video as unknown as MediaStreamTrack,
    audio as unknown as MediaStreamTrack
  ]) as unknown as MediaStream;
  return { stream, video, audio };
};

const subjects: DirectScreenShare[] = [];
const originals = new Map<string, PropertyDescriptor | undefined>();
let clock: TestClock;

const replaceGlobal = (key: string, value: unknown) => {
  originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
};

beforeEach(() => {
  clock = new TestClock();
  TestPeer.instances = [];
  TestPeer.plans = [];
  replaceGlobal('RTCPeerConnection', TestPeer);
  replaceGlobal('MediaStream', TestStream);
  replaceGlobal('RTCRtpReceiver', {
    getCapabilities: () => ({
      codecs: [
        { mimeType: 'video/VP8', clockRate: 90000 },
        { mimeType: 'video/H264', clockRate: 90000 },
        { mimeType: 'video/rtx', clockRate: 90000 }
      ],
      headerExtensions: []
    })
  });
  replaceGlobal('setTimeout', clock.setTimeout);
  replaceGlobal('clearTimeout', clock.clearTimeout);
});

afterEach(() => {
  for (const subject of subjects.splice(0)) subject.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  originals.clear();
});

type TObservedScreenStream = {
  userId: number;
  stream: MediaStream;
  kind: StreamKind;
};

type TDirectScreenFixture = {
  subject: DirectScreenShare;
  sent: { sessionId: string; signal: TDirectScreenSignal }[];
  statuses: string[];
  errors: unknown[];
  streams: TObservedScreenStream[];
  removed: TObservedScreenStream[];
  start: (stream?: MediaStream) => Promise<boolean>;
  readonly fallbacks: number;
};

const fixture = (
  prepare: () => Promise<TDirectScreenSession | null> = async () => session(),
  send?: (sessionId: string, signal: TDirectScreenSignal) => Promise<void>
): TDirectScreenFixture => {
  const sent: { sessionId: string; signal: TDirectScreenSignal }[] = [];
  const statuses: string[] = [];
  const errors: unknown[] = [];
  const streams: TObservedScreenStream[] = [];
  const removed: TObservedScreenStream[] = [];
  let fallbacks = 0;
  const subject = new DirectScreenShare({
    prepare,
    send: async (sessionId, signal) => {
      sent.push({ sessionId, signal });
      await send?.(sessionId, signal);
    },
    onStatus: (status) => statuses.push(status),
    onError: (error) => errors.push(error),
    onStream: (userId, stream, kind) => streams.push({ userId, stream, kind }),
    onRemoveStream: (userId, kind, stream) =>
      removed.push({ userId, kind, stream })
  });
  subjects.push(subject);
  const start = (stream = capture().stream) =>
    subject.start(stream, {
      maxBitrate: 4_000_000,
      codec: 'video/H264',
      onFallback: async () => {
        fallbacks++;
      }
    });
  return {
    subject,
    sent,
    statuses,
    errors,
    streams,
    removed,
    start,
    get fallbacks() {
      return fallbacks;
    }
  };
};

const answer = async (subject: DirectScreenShare, sessionId = 'outgoing') => {
  await subject.handleSignal(event(sessionId, { type: 'answer', sdp: ANSWER }));
};

const establish = async (subject: TDirectScreenFixture) => {
  const started = subject.start();
  await flush();
  const peer = TestPeer.instances[0]!;
  await answer(subject.subject);
  peer.connect();
  await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
  expect(await started).toBe(true);
  return peer;
};

describe('DirectScreenShare outgoing lifecycle', () => {
  test('stop cancels prepare and safely retires a late session without opening a peer', async () => {
    const pending = deferred<TDirectScreenSession | null>();
    const subject = fixture(() => pending.promise);
    const media = capture();
    const started = subject.start(media.stream);
    subject.subject.stop();
    expect(await started).toBe(false);
    pending.resolve(session('late'));
    await flush();
    expect(TestPeer.instances).toHaveLength(0);
    expect(subject.sent).toEqual([
      { sessionId: 'late', signal: { type: 'stop' } }
    ]);
    expect(subject.fallbacks).toBe(0);
    expect(media.video.stopped + media.audio.stopped).toBe(0);
  });

  test('deadline includes prepare and a late response cannot revive a timed-out attempt', async () => {
    const pending = deferred<TDirectScreenSession | null>();
    const subject = fixture(() => pending.promise);
    let result: boolean | undefined;
    const started = subject.start().then((value) => {
      result = value;
      return value;
    });
    await clock.advance(7_999);
    expect(result).toBeUndefined();
    await clock.advance(1);
    expect(await started).toBe(false);
    pending.resolve(session('late'));
    await flush();
    expect(TestPeer.instances).toHaveLength(0);
    expect(subject.sent).toEqual([
      { sessionId: 'late', signal: { type: 'stop' } }
    ]);
    expect(subject.statuses.at(-1)).toBe('relayed');
  });

  test('server declining direct sharing resolves false without established fallback', async () => {
    const subject = fixture(async () => null);
    expect(await subject.start()).toBe(false);
    expect(TestPeer.instances).toHaveLength(0);
    expect(subject.fallbacks).toBe(0);
  });

  test('native peer construction failure retires the prepared server session for SFU fallback', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'RTCPeerConnection'
    );
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      value: undefined
    });
    try {
      const subject = fixture();
      const media = capture();
      expect(await subject.start(media.stream)).toBe(false);
      await flush();
      expect(subject.sent).toEqual([
        { sessionId: 'outgoing', signal: { type: 'fallback' } }
      ]);
      expect(subject.fallbacks).toBe(0);
      expect(media.video.stopped + media.audio.stopped).toBe(0);
    } finally {
      if (descriptor)
        Object.defineProperty(globalThis, 'RTCPeerConnection', descriptor);
    }
  });

  test('prepare rejection resolves false and reports the real error', async () => {
    const error = new Error('prepare failed');
    const subject = fixture(async () => {
      throw error;
    });
    expect(await subject.start()).toBe(false);
    expect(subject.errors).toContain(error);
    expect(subject.fallbacks).toBe(0);
  });

  test.each(['offer', 'local'] as const)(
    'stop blocks stale %s SDP continuation',
    async (operation) => {
      const pending = deferred<void>();
      TestPeer.plans.push({ [operation]: pending.promise });
      const subject = fixture();
      const started = subject.start();
      await flush();
      subject.subject.stop();
      expect(await started).toBe(false);
      pending.resolve();
      await flush();
      expect(TestPeer.instances[0]!.connectionState).toBe('closed');
      expect(subject.sent.map(({ signal }) => signal.type)).toEqual(['stop']);
      expect(subject.statuses.at(-1)).toBe('idle');
    }
  );

  test('stop blocks stale remote answer continuation and ready cannot revive it', async () => {
    const pending = deferred<void>();
    TestPeer.plans.push({ remote: pending.promise });
    const subject = fixture();
    const started = subject.start();
    await flush();
    const answering = answer(subject.subject);
    await flush();
    subject.subject.stop();
    expect(await started).toBe(false);
    pending.resolve();
    await answering;
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(subject.statuses).not.toContain('direct');
    expect(subject.fallbacks).toBe(0);
  });

  test('sends sendonly screen transceivers with native codec preference and gathered SDP', async () => {
    const subject = fixture();
    const media = capture();
    const started = subject.start(media.stream);
    await flush();
    const peer = TestPeer.instances[0]!;
    expect(peer.configuration).toEqual({
      iceServers: [{ urls: ['stun:example.com:3478'] }]
    });
    expect(peer.transceivers).toHaveLength(2);
    expect(peer.transceivers[0]!.track).toBe(media.stream.getVideoTracks()[0]);
    expect(peer.transceivers[0]!.init).toEqual({
      direction: 'sendonly',
      streams: [media.stream],
      sendEncodings: [{ maxBitrate: 4_000_000 }]
    });
    expect(peer.transceivers[1]!.init.direction).toBe('sendonly');
    expect(peer.transceivers[0]!.codecs.map((codec) => codec.mimeType)).toEqual(
      ['video/H264', 'video/VP8', 'video/rtx']
    );
    expect(subject.sent).toEqual([
      {
        sessionId: 'outgoing',
        signal: { type: 'offer', sdp: OFFER + CANDIDATE }
      }
    ]);
    subject.subject.stop();
    expect(await started).toBe(false);
  });

  test('waits for both local connected and receiver ready after answer', async () => {
    const subject = fixture();
    let result: boolean | undefined;
    const started = subject.start().then((value) => {
      result = value;
      return value;
    });
    await flush();
    await answer(subject.subject);
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(result).toBeUndefined();
    TestPeer.instances[0]!.connect();
    expect(await started).toBe(true);
    expect(subject.statuses.at(-1)).toBe('direct');
  });

  test('native rejection of a remote answer resolves false and preserves capture for SFU', async () => {
    const remote = deferred<void>();
    const error = new Error('invalid native SDP');
    TestPeer.plans.push({ remote: remote.promise });
    const subject = fixture();
    const media = capture();
    const started = subject.start(media.stream);
    await flush();
    const handling = answer(subject.subject);
    await flush();
    remote.reject(error);
    await handling;
    expect(await started).toBe(false);
    await flush();
    expect(subject.errors).toContain(error);
    expect(TestPeer.instances[0]!.connectionState).toBe('closed');
    expect(subject.sent.at(-1)).toEqual({
      sessionId: 'outgoing',
      signal: { type: 'fallback' }
    });
    expect(media.video.stopped + media.audio.stopped).toBe(0);
    expect(subject.fallbacks).toBe(0);
  });

  test('failed offer send resolves false without stopping capture or calling established fallback', async () => {
    const error = new Error('signalling failed');
    const subject = fixture(undefined, async () => {
      throw error;
    });
    const media = capture();
    expect(await subject.start(media.stream)).toBe(false);
    await flush();
    expect(subject.errors).toContain(error);
    expect(TestPeer.instances[0]!.connectionState).toBe('closed');
    expect(media.video.stopped + media.audio.stopped).toBe(0);
    expect(subject.fallbacks).toBe(0);
  });

  test('a hanging send stays inside the original eight-second deadline', async () => {
    const prepare = deferred<TDirectScreenSession | null>();
    const sending = deferred<void>();
    const subject = fixture(
      () => prepare.promise,
      () => sending.promise
    );
    const started = subject.start();
    await clock.advance(7_000);
    prepare.resolve(session());
    await flush();
    await clock.advance(1_000);
    expect(await started).toBe(false);
    expect(TestPeer.instances[0]!.connectionState).toBe('closed');
    sending.resolve();
    await flush();
    expect(subject.statuses).not.toContain('direct');
  });

  test('ICE collection sends current full local SDP within two seconds even when gathering stalls', async () => {
    TestPeer.plans.push({ gathering: true });
    const subject = fixture();
    const started = subject.start();
    await flush();
    expect(subject.sent).toHaveLength(0);
    await clock.advance(1_999);
    expect(subject.sent).toHaveLength(0);
    await clock.advance(1);
    expect(subject.sent).toEqual([
      { sessionId: 'outgoing', signal: { type: 'offer', sdp: OFFER } }
    ]);
    subject.subject.stop();
    expect(await started).toBe(false);
  });

  test('gathering completion sends all native candidates without trickle messages', async () => {
    TestPeer.plans.push({ gathering: true });
    const subject = fixture();
    const started = subject.start();
    await flush();
    TestPeer.instances[0]!.gather();
    await flush();
    expect(subject.sent).toEqual([
      {
        sessionId: 'outgoing',
        signal: { type: 'offer', sdp: OFFER + CANDIDATE }
      }
    ]);
    subject.subject.stop();
    expect(await started).toBe(false);
  });

  test('established failure falls back exactly once despite duplicate failure and terminal events', async () => {
    const subject = fixture();
    const media = capture();
    const started = subject.start(media.stream);
    await flush();
    const peer = TestPeer.instances[0]!;
    await answer(subject.subject);
    peer.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(await started).toBe(true);
    peer.connect('failed');
    peer.connect('disconnected');
    await subject.subject.handleSignal(event('outgoing', { type: 'fallback' }));
    await flush();
    expect(subject.fallbacks).toBe(1);
    expect(subject.statuses.at(-1)).toBe('relayed');
    expect(
      subject.sent.filter(({ signal }) => signal.type === 'fallback')
    ).toHaveLength(1);
    expect(media.video.stopped + media.audio.stopped).toBe(0);
  });

  test('mismatched metadata and out-of-order ready do not establish or tear down the paired session', async () => {
    const subject = fixture();
    const started = subject.start();
    await flush();
    const peer = TestPeer.instances[0]!;
    peer.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    await subject.subject.handleSignal({
      ...event('outgoing', { type: 'answer', sdp: ANSWER }),
      fromUserId: 3
    });
    expect(peer.remoteDescription).toBeNull();
    await answer(subject.subject);
    await subject.subject.handleSignal({
      ...event('outgoing', { type: 'fallback' }),
      channelId: 99
    });
    await subject.subject.handleSignal({
      ...event('outgoing', { type: 'fallback' }),
      senderId: 99
    });
    expect(peer.closeCount).toBe(0);
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(await started).toBe(true);
  });

  test('restarting does not let a late old prepare stop or replace the new outgoing session', async () => {
    const oldPrepare = deferred<TDirectScreenSession | null>();
    let calls = 0;
    const subject = fixture(() =>
      ++calls === 1 ? oldPrepare.promise : Promise.resolve(session('new'))
    );
    const oldStart = subject.start();
    const newStart = subject.start();
    expect(await oldStart).toBe(false);
    await flush();
    oldPrepare.resolve(session('old'));
    await flush();
    expect(TestPeer.instances).toHaveLength(1);
    expect(
      subject.sent.some(
        (entry) => entry.sessionId === 'old' && entry.signal.type === 'stop'
      )
    ).toBe(true);
    await answer(subject.subject, 'new');
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('new', { type: 'ready' }));
    expect(await newStart).toBe(true);
  });
});

describe('DirectScreenShare incoming lifecycle', () => {
  test('ready requires connected plus a screen video track and received audio stays screen audio', async () => {
    const subject = fixture();
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    const peer = TestPeer.instances[0]!;
    peer.connect();
    await flush();
    expect(subject.sent.map(({ signal }) => signal.type)).toEqual(['answer']);
    const audio = new TestTrack('audio') as unknown as MediaStreamTrack;
    const video = new TestTrack('video') as unknown as MediaStreamTrack;
    peer.receive(audio);
    await flush();
    expect(subject.sent.map(({ signal }) => signal.type)).toEqual(['answer']);
    peer.receive(video);
    await flush();
    expect(subject.sent).toEqual([
      {
        sessionId: 'incoming',
        signal: { type: 'answer', sdp: ANSWER + CANDIDATE }
      },
      { sessionId: 'incoming', signal: { type: 'ready' } }
    ]);
    expect(subject.streams.map(({ kind }) => kind)).toEqual([
      StreamKind.SCREEN_AUDIO,
      StreamKind.SCREEN
    ]);
    expect(subject.streams[0]!.stream.getTracks()).toEqual([audio]);
    expect(subject.streams[1]!.stream.getTracks()).toEqual([video]);
    expect(subject.statuses).toEqual([]);
  });

  test('incoming ready waits for answer send completion even if video and connection arrive first', async () => {
    const sending = deferred<void>();
    const subject = fixture(undefined, async (_, signal) => {
      if (signal.type === 'answer') await sending.promise;
    });
    const handling = subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    await flush();
    const peer = TestPeer.instances[0]!;
    peer.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    peer.connect();
    await flush();
    expect(subject.sent.map(({ signal }) => signal.type)).toEqual(['answer']);
    sending.resolve();
    await handling;
    await flush();
    expect(subject.sent.map(({ signal }) => signal.type)).toEqual([
      'answer',
      'ready'
    ]);
  });

  test.each(['remote', 'answer', 'local'] as const)(
    'terminal stop cancels stale incoming %s continuation',
    async (operation) => {
      const pending = deferred<void>();
      TestPeer.plans.push({ [operation]: pending.promise });
      const subject = fixture();
      const handling = subject.subject.handleSignal(
        event('incoming', { type: 'offer', sdp: OFFER }, true)
      );
      await flush();
      await subject.subject.handleSignal(
        event('incoming', { type: 'stop' }, true)
      );
      pending.resolve();
      await handling;
      expect(TestPeer.instances[0]!.closeCount).toBe(1);
      expect(subject.sent).toHaveLength(0);
      await subject.subject.handleSignal(
        event('incoming', { type: 'offer', sdp: OFFER }, true)
      );
      expect(TestPeer.instances).toHaveLength(1);
    }
  );

  test('incoming answer failure closes the peer, removes exact direct streams, and notifies sender', async () => {
    const error = new Error('answer failed');
    const sending = deferred<void>();
    const subject = fixture(undefined, async (_, signal) => {
      if (signal.type === 'answer') await sending.promise;
    });
    const handling = subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    await flush();
    const peer = TestPeer.instances[0]!;
    peer.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    const stream = subject.streams[0]!.stream;
    sending.reject(error);
    await handling;
    expect(peer.connectionState).toBe('closed');
    expect(subject.errors).toContain(error);
    expect(subject.removed).toEqual([
      { userId: 2, kind: StreamKind.SCREEN, stream }
    ]);
    expect(subject.sent.at(-1)).toEqual({
      sessionId: 'incoming',
      signal: { type: 'fallback' }
    });
  });

  test('incoming connection failure notifies sender once and removes only its own direct stream identities', async () => {
    const subject = fixture();
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    const peer = TestPeer.instances[0]!;
    peer.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    peer.receive(new TestTrack('audio') as unknown as MediaStreamTrack);
    peer.connect();
    await flush();
    peer.connect('failed');
    peer.connect('failed');
    await flush();
    expect(
      subject.sent.filter(({ signal }) => signal.type === 'fallback')
    ).toHaveLength(1);
    expect(subject.removed).toHaveLength(2);
    for (const removed of subject.removed) {
      expect(
        subject.streams.some(
          (stream) =>
            stream.stream === removed.stream && stream.kind === removed.kind
        )
      ).toBe(true);
    }
  });

  test('incoming attempts time out and close without stopping an independent outgoing session', async () => {
    const subject = fixture();
    const outgoing = await establish(subject);
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    const incoming = TestPeer.instances[1]!;
    await clock.advance(8_000);
    expect(incoming.connectionState).toBe('closed');
    expect(outgoing.closeCount).toBe(0);
    expect(subject.fallbacks).toBe(0);
    expect(subject.sent.at(-1)).toEqual({
      sessionId: 'incoming',
      signal: { type: 'fallback' }
    });
  });

  test('stop closes only outgoing; close removes incoming and never stops original capture', async () => {
    const subject = fixture();
    const media = capture();
    const started = subject.start(media.stream);
    await flush();
    await answer(subject.subject);
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(await started).toBe(true);
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    const incoming = TestPeer.instances[1]!;
    incoming.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    subject.subject.stop();
    expect(TestPeer.instances[0]!.connectionState).toBe('closed');
    expect(incoming.closeCount).toBe(0);
    expect(subject.removed).toHaveLength(0);
    subject.subject.close();
    expect(incoming.connectionState).toBe('closed');
    expect(subject.removed[0]!.stream).toBe(subject.streams[0]!.stream);
    expect(media.video.stopped + media.audio.stopped).toBe(0);
    expect(subject.fallbacks).toBe(0);
  });

  test('stale events cannot remove a new stream or reopen a retired incoming session', async () => {
    const subject = fixture();
    await subject.subject.handleSignal(
      event('old', { type: 'offer', sdp: OFFER }, true)
    );
    const oldPeer = TestPeer.instances[0]!;
    oldPeer.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    await subject.subject.handleSignal(
      event('old', { type: 'fallback' }, true)
    );
    await subject.subject.handleSignal(
      event('new', { type: 'offer', sdp: OFFER }, true)
    );
    const newPeer = TestPeer.instances[1]!;
    newPeer.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    const replacement = subject.streams[1]!.stream;
    await subject.subject.handleSignal(event('old', { type: 'stop' }, true));
    await subject.subject.handleSignal(
      event('old', { type: 'offer', sdp: OFFER }, true)
    );
    oldPeer.connect('failed');
    oldPeer.receive(new TestTrack('audio') as unknown as MediaStreamTrack);
    expect(TestPeer.instances).toHaveLength(2);
    expect(newPeer.closeCount).toBe(0);
    expect(subject.removed).toHaveLength(1);
    expect(subject.removed[0]!.stream).not.toBe(replacement);
    expect(subject.streams).toHaveLength(2);
  });

  test('duplicate offers and mismatched terminal identities cannot replace or close incoming peers', async () => {
    const subject = fixture();
    await subject.subject.handleSignal({
      ...event('bad', { type: 'offer', sdp: OFFER }, true),
      fromUserId: 3
    });
    expect(TestPeer.instances).toHaveLength(0);
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    await subject.subject.handleSignal({
      ...event('incoming', { type: 'stop' }, true),
      fromUserId: 3
    });
    await subject.subject.handleSignal({
      ...event('incoming', { type: 'stop' }, true),
      channelId: 99
    });
    expect(TestPeer.instances).toHaveLength(1);
    expect(TestPeer.instances[0]!.closeCount).toBe(0);
  });

  test('default empty STUN configuration negotiates simultaneous direct screen peers', async () => {
    const subject = fixture(async () => ({ ...session(), stunUrls: [] }));
    const started = subject.start();
    await flush();
    expect(TestPeer.instances).toHaveLength(1);
    await answer(subject.subject);
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(await started).toBe(true);
    expect(subject.statuses.at(-1)).toBe('direct');
    await subject.subject.handleSignal({
      ...event('incoming', { type: 'offer', sdp: OFFER }, true),
      stunUrls: []
    });
    expect(TestPeer.instances).toHaveLength(2);
    const incoming = TestPeer.instances[1]!;
    incoming.receive(new TestTrack('video') as unknown as MediaStreamTrack);
    incoming.connect();
    await flush();
    expect(subject.sent.at(-1)).toEqual({
      sessionId: 'incoming',
      signal: { type: 'ready' }
    });
    expect(subject.streams[0]!.kind).toBe(StreamKind.SCREEN);
    expect(subject.errors).toHaveLength(0);
  });

  test('close before voice initialization allows a fresh outgoing and incoming share', async () => {
    const subject = fixture();
    subject.subject.close();
    const started = subject.start();
    await flush();
    await subject.subject.handleSignal(
      event('incoming', { type: 'offer', sdp: OFFER }, true)
    );
    expect(TestPeer.instances).toHaveLength(2);
    await answer(subject.subject);
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('outgoing', { type: 'ready' }));
    expect(await started).toBe(true);
    expect(TestPeer.instances[1]!.closeCount).toBe(0);
  });

  test('close cancels an old prepare without blocking fresh sessions or reviving the late result', async () => {
    const pending = deferred<TDirectScreenSession | null>();
    let calls = 0;
    const subject = fixture(() =>
      ++calls === 1 ? pending.promise : Promise.resolve(session('fresh'))
    );
    const oldStart = subject.start();
    subject.subject.close();
    expect(await oldStart).toBe(false);
    const freshStart = subject.start();
    await flush();
    pending.resolve(session('late'));
    await flush();
    expect(TestPeer.instances).toHaveLength(1);
    expect(
      subject.sent.some(
        ({ sessionId, signal }) =>
          sessionId === 'late' && signal.type === 'stop'
      )
    ).toBe(true);
    await answer(subject.subject, 'fresh');
    TestPeer.instances[0]!.connect();
    await subject.subject.handleSignal(event('fresh', { type: 'ready' }));
    expect(await freshStart).toBe(true);
  });
});
