import { NoiseSuppression } from '@/types';
import { ChannelType } from '@sharkord/shared';
import { beforeEach, expect, mock, test } from 'bun:test';
import * as React from 'react';

// Run the real provider and channel-selection caller; substitute the scheduler,
// browser capture/processing and network/transport boundaries only.
let slots: unknown[] = [];
let cursor = 0;
let effects: (() => void | (() => void))[] = [];
mock.module('react', () => ({
  ...React,
  memo: <T>(value: T) => value,
  useRef: (value: unknown) => {
    const index = cursor++;
    return (slots[index] ??= { current: value });
  },
  useState: (value: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = value;
    return [
      slots[index],
      (next: unknown) => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }
    ];
  },
  useCallback: <T>(value: T) => value,
  useMemo: (factory: () => unknown) => factory(),
  useEffect: (effect: () => void | (() => void)) => {
    effects.push(effect);
  }
}));
mock.module('@/helpers/browser-logger', () => ({
  logVoice() {},
  logVoiceWarn() {},
  logVoiceError() {}
}));
mock.module('@/helpers/sounds', () => ({ playSound() {} }));
mock.module('@/helpers/voice-debug', () => ({
  registerVoiceDebugSource: () => () => {}
}));
mock.module('@/hooks/use-screen-share-support', () => ({
  useScreenShareSupport: () => ({ isScreenShareSupported: false })
}));
mock.module('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));
const errorToast = mock(() => {});
mock.module('sonner', () => ({ toast: { error: errorToast } }));
let channelId: number | undefined;
mock.module('@/features/server/channels/hooks', () => ({
  useCurrentVoiceChannelId: () => channelId
}));
mock.module('@/features/server/hooks', () => ({
  useWebRtcSimulcastEnabled: () => false
}));
const leaveVoice = mock(async () => {});
mock.module('@/features/server/voice/actions', () => ({
  updateOwnVoiceState() {},
  joinVoice: async () => ({}),
  leaveVoice
}));
mock.module('@/features/server/channels/actions', () => ({
  setSelectedChannelId() {}
}));
mock.module('@/features/server/channels/selectors', () => ({
  channelByIdSelector: (_state: unknown, id: number) => ({
    id,
    type: ChannelType.VOICE
  })
}));
mock.module('@/features/store', () => ({ store: { getState: () => ({}) } }));

let voice: import('../index').TVoiceProvider;
mock.module('@/features/server/voice/hooks', () => ({
  useOwnVoiceState: () => ({ micMuted: false, soundMuted: false }),
  useVoice: () => voice
}));
const devices = { noiseSuppression: 'disabled', noiseGateEnabled: false };
mock.module('../../devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices })
}));
for (const [path, name] of [
  ['../demo-visibility-context', 'DemoVisibilityProvider'],
  ['../floating-pinned-card', 'FloatingPinnedCard'],
  ['../remote-webcam-visibility-context', 'RemoteWebcamVisibilityProvider'],
  ['../volume-control-context', 'VolumeControlProvider']
])
  mock.module(path!, () => ({ [name!]: () => null }));
mock.module('../hooks/use-direct-screen-share', () => ({
  useDirectScreenShare: () => ({
    directScreenShare: {
      close() {},
      stop() {},
      acceptPendingOffer() {},
      stopReceiving() {}
    }
  })
}));
const monitor = mock(() => {});
mock.module('../hooks/use-transport-stats', () => ({
  useTransportStats: () => ({
    startMonitoring: monitor,
    stopMonitoring() {},
    resetStats() {},
    setScreenShareProducer() {}
  })
}));
mock.module('mediasoup-client', () => ({
  Device: class {
    rtpCapabilities = {};
    async load() {}
  }
}));
const updateState = mock(async () => {});
mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    voice: {
      updateState: { mutate: updateState },
      closeProducer: { mutate: async () => {} }
    }
  })
}));
const generation = { current: 0 };
const send = { current: undefined as ReturnType<typeof transport> | undefined };
const recv = { current: undefined as ReturnType<typeof transport> | undefined };
const producer = () => ({
  id: 'p',
  close: mock(() => {}),
  observer: { on() {} }
});
let nextProduction: Promise<ReturnType<typeof producer>> | undefined;
function transport() {
  const pending = nextProduction;
  nextProduction = undefined;
  const value = {
    closed: false,
    close() {
      value.closed = true;
    },
    produce: mock(async () => pending ?? producer())
  };
  return value;
}
mock.module('../hooks/use-transports', () => ({
  useTransports: () => ({
    producerTransport: send,
    consumerTransport: recv,
    sessionGenerationRef: generation,
    consumers: { current: {} },
    consumeRef: { current: null },
    createProducerTransport: async () => {
      send.current = transport();
    },
    createConsumerTransport: async () => {
      recv.current = transport();
    },
    consumeExistingProducers: async () => {},
    cleanupTransports: () => {
      generation.current++;
      send.current?.close();
      recv.current?.close();
      send.current = recv.current = undefined;
    },
    closeConsumer() {},
    closeConsumers() {},
    pauseDemoConsumers() {},
    getConsumer() {},
    getConsumerCodec() {}
  })
}));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
class Track {
  id = 'mic';
  label = 'mic';
  enabled = true;
  readyState = 'live';
  onended: (() => void) | null = null;
  stop() {
    this.readyState = 'ended';
  }
  getSettings() {
    return {};
  }
}
class Stream {
  constructor(public tracks = [new Track()]) {}
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}
const capture = mock(async () => new Stream());
const gate = mock(async () => ({ connect() {}, disconnect: mock(() => {}) }));
const suppress = mock(
  async (
    _type: unknown,
    _stream: unknown,
    register?: (context: AudioContext) => void
  ) => {
    const context = new Context();
    register?.(context as unknown as AudioContext);
    return { contexts: [context], outputTrack: context.output.tracks[0]! };
  }
);
mock.module('@/helpers/audio-worklet/ns-worklet', () => ({
  createNsChain: suppress
}));
const contexts: Context[] = [];
class Context {
  closed = false;
  closeCalls = 0;
  rejectClose = false;
  output = new Stream();
  constructor() {
    contexts.push(this);
  }
  close() {
    this.closeCalls++;
    this.closed = true;
    if (this.rejectClose)
      return Promise.reject(new Error('context close failed'));
    return Promise.resolve();
  }
  createMediaStreamSource() {
    return { connect() {} };
  }
  createMediaStreamDestination() {
    return { stream: this.output };
  }
}
mock.module('@/helpers/audio-worklet/noise-gate-worklet', () => ({
  createNoiseGateWorkletNode: gate,
  getNoiseGateWorkletAvailabilitySnapshot: () => ({ available: true }),
  markNoiseGateWorkletUnavailable() {},
  postNoiseGateWorkletConfig() {}
}));
const { VoiceProvider } = await import('../index');
const { useSelectChannel } = await import('@/hooks/use-select-channel');
const render = () => {
  cursor = 0;
  effects = [];
  const tree = (
    VoiceProvider as unknown as (props: {
      children: null;
    }) => React.ReactElement<{ value: typeof voice }>
  )({ children: null });
  voice = tree.props.value;
  return voice;
};
const flush = async () => {
  for (let i = 0; i < 60; i++) await Promise.resolve();
};
beforeEach(() => {
  slots = [];
  contexts.length = 0;
  generation.current = 0;
  send.current = recv.current = undefined;
  nextProduction = undefined;
  channelId = 1;
  devices.noiseGateEnabled = false;
  devices.noiseSuppression = 'disabled';
  suppress.mockReset();
  suppress.mockImplementation(async (_type, _stream, register) => {
    const context = new Context();
    register?.(context as unknown as AudioContext);
    return { contexts: [context], outputTrack: context.output.tracks[0]! };
  });
  capture.mockReset();
  capture.mockImplementation(async () => new Stream());
  gate.mockReset();
  gate.mockImplementation(async () => ({
    connect() {},
    disconnect: mock(() => {})
  }));
  leaveVoice.mockClear();
  errorToast.mockClear();
  monitor.mockClear();
  updateState.mockReset();
  updateState.mockImplementation(async () => {});
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: capture } }
  });
  Object.assign(globalThis, {
    MediaStream: Stream,
    window: { AudioContext: Context },
    localStorage: { getItem: () => null, setItem() {} }
  });
  render();
});

test('genuine current initialization failure still leaves voice and reports failure', async () => {
  updateState.mockImplementationOnce(async () => {
    throw new Error('RPC unavailable');
  });
  await useSelectChannel()(2);
  expect(leaveVoice).toHaveBeenCalledWith({ reason: 'init_failed' });
  expect(errorToast).toHaveBeenCalledTimes(1);
  expect(render().loading).toBe(false);
  expect(String(render().connectionStatus)).toBe('failed');
});

test('leaving while capture is pending resets loading without replacement', async () => {
  const pending = deferred<Stream>();
  capture.mockImplementationOnce(() => pending.promise);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  expect(render().loading).toBe(true);
  // Establish the channel observer, then deliver the real leave transition.
  effects.forEach((effect) => effect());
  channelId = undefined;
  render();
  effects.forEach((effect) => effect());
  expect(render().loading).toBe(false);
  const stream = new Stream();
  pending.resolve(stream);
  await old;
  expect(render().loading).toBe(false);
  expect(stream.tracks[0]!.readyState).toBe('ended');
});

test('leave immediately stops acquired microphone and closes pending gate context', async () => {
  devices.noiseGateEnabled = true;
  const raw = new Stream();
  capture.mockImplementationOnce(async () => raw);
  const pending = deferred<Awaited<ReturnType<typeof gate>>>();
  const node = { connect() {}, disconnect: mock(() => {}) };
  gate.mockImplementationOnce(() => pending.promise);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  effects.forEach((effect) => effect());
  channelId = undefined;
  render();
  effects.forEach((effect) => effect());
  expect(render().loading).toBe(false);
  expect(raw.tracks[0]!.readyState).toBe('ended');
  expect(contexts[0]!.closed).toBe(true);
  pending.resolve(node);
  await old;
  expect(node.disconnect).toHaveBeenCalled();
});

for (const mode of ['leave', 'replacement'] as const) {
  test(`${mode} immediately disposes resources during pending suppression`, async () => {
    devices.noiseGateEnabled = true;
    devices.noiseSuppression = NoiseSuppression.RNNOISE;
    const raw = new Stream();
    capture.mockImplementationOnce(async () => raw);
    const pending = deferred<Awaited<ReturnType<typeof suppress>>>();
    const nsContext = new Context();
    suppress.mockImplementationOnce((_type, _stream, register) => {
      register?.(nsContext as unknown as AudioContext);
      return pending.promise;
    });
    const old = voice.init({}, 1).catch(() => {});
    await flush();
    const gateContext = contexts[1]!;
    if (mode === 'replacement') {
      await voice.init({}, 2);
    } else {
      effects.forEach((effect) => effect());
      channelId = undefined;
      render();
      effects.forEach((effect) => effect());
    }
    expect(raw.tracks[0]!.readyState).toBe('ended');
    expect(gateContext.closed).toBe(true);
    expect(gateContext.output.tracks[0]!.readyState).toBe('ended');
    expect(nsContext.closed).toBe(true);
    const current = send.current;
    const stream = render().localAudioStream;
    pending.resolve({
      contexts: [nsContext],
      outputTrack: nsContext.output.tracks[0]!
    });
    await old;
    expect(nsContext.output.tracks[0]!.readyState).toBe('ended');
    expect(send.current).toBe(current);
    expect(render().localAudioStream).toBe(stream);
    if (mode === 'replacement') {
      expect(current!.closed).toBe(false);
      expect(contexts[2]!.closed).toBe(false);
      expect(contexts[3]!.closed).toBe(false);
    }
  });
}

test('cancelled startup disposes each context once even when close rejects', async () => {
  devices.noiseGateEnabled = true;
  const pending = deferred<Awaited<ReturnType<typeof gate>>>();
  gate.mockImplementationOnce(() => pending.promise);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  const context = contexts[0]!;
  context.rejectClose = true;
  await voice.init({}, 2);
  pending.resolve({ connect() {}, disconnect: mock(() => {}) });
  await old;
  await flush();
  expect(context.closeCalls).toBe(1);
  expect(send.current!.closed).toBe(false);
});

test('cancelled A caller never leaves B after late microphone processing', async () => {
  devices.noiseGateEnabled = true;
  const pending = deferred<Awaited<ReturnType<typeof gate>>>();
  const node = { connect() {}, disconnect: mock(() => {}) };
  gate.mockImplementationOnce(() => pending.promise);
  const select = useSelectChannel();
  const old = select(2);
  await flush();
  await select(3);
  const current = send.current!;
  const stream = render().localAudioStream;
  pending.resolve(node);
  await old;
  expect(leaveVoice).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
  expect(current.produce).toHaveBeenCalledTimes(1);
  expect(render().localAudioStream).toBe(stream);
  expect(contexts[0]!.closed).toBe(true);
  expect(contexts[1]!.closed).toBe(false);
});

test('cancelled A caller never leaves B on late capture rejection', async () => {
  const pending = deferred<Stream>();
  capture.mockImplementationOnce(() => pending.promise);
  const select = useSelectChannel();
  const old = select(2);
  await flush();
  await select(3);
  const current = send.current!;
  pending.reject(new Error('capture failed'));
  await old;
  expect(leaveVoice).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
  expect(current.closed).toBe(false);
  expect(String(render().connectionStatus)).toBe('connected');
});

test('cancelled A caller preserves B loading during deferred B capture', async () => {
  const a = deferred<Stream>();
  const b = deferred<Stream>();
  capture
    .mockImplementationOnce(() => a.promise)
    .mockImplementationOnce(() => b.promise);
  const select = useSelectChannel();
  const old = select(2);
  await flush();
  const replacement = select(3);
  await flush();
  const current = send.current!;
  a.reject(new Error('old capture rejected'));
  await old;
  expect(leaveVoice).not.toHaveBeenCalled();
  expect(render().loading).toBe(true);
  expect(current.closed).toBe(false);
  b.resolve(new Stream());
  await replacement;
  expect(render().loading).toBe(false);
  expect(current.produce).toHaveBeenCalledTimes(1);
});

test('cancelled A caller preserves B loading during deferred B processing', async () => {
  devices.noiseGateEnabled = true;
  const a = deferred<Awaited<ReturnType<typeof gate>>>();
  const b = deferred<Awaited<ReturnType<typeof gate>>>();
  gate
    .mockImplementationOnce(() => a.promise)
    .mockImplementationOnce(() => b.promise);
  const select = useSelectChannel();
  const old = select(2);
  await flush();
  const replacement = select(3);
  await flush();
  const current = send.current!;
  a.resolve({ connect() {}, disconnect: mock(() => {}) });
  await old;
  expect(leaveVoice).not.toHaveBeenCalled();
  expect(render().loading).toBe(true);
  expect(current.produce).not.toHaveBeenCalled();
  expect(contexts[0]!.closed).toBe(true);
  expect(contexts[1]!.closed).toBe(false);
  b.resolve({ connect() {}, disconnect: mock(() => {}) });
  await replacement;
  expect(render().loading).toBe(false);
  expect(current.produce).toHaveBeenCalledTimes(1);
});

test('late A processing disposes its graph without overwriting B', async () => {
  devices.noiseGateEnabled = true;
  const pending = deferred<Awaited<ReturnType<typeof gate>>>();
  const node = { connect() {}, disconnect: mock(() => {}) };
  gate.mockImplementationOnce(() => pending.promise);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  const oldContext = contexts[0]!;
  await voice.init({}, 2);
  expect(oldContext.closed).toBe(true);
  const current = send.current!;
  const bStream = render().localAudioStream;
  pending.resolve(node);
  await old;
  expect(current.produce).toHaveBeenCalledTimes(1);
  expect(render().localAudioStream).toBe(bStream);
  expect(oldContext.closed).toBe(true);
  expect(node.disconnect).toHaveBeenCalled();
  expect(contexts[1]!.closed).toBe(false);
});

for (const mode of ['leave', 'replacement'] as const) {
  for (const result of ['resolve', 'reject'] as const) {
    test(`late native produce ${result} after ${mode} stays isolated`, async () => {
      const pending = deferred<ReturnType<typeof producer>>();
      nextProduction = pending.promise;
      const raw = new Stream();
      capture.mockImplementationOnce(async () => raw);
      const select = useSelectChannel();
      const old = select(2);
      await flush();
      const oldTransport = send.current!;
      expect(oldTransport.produce).toHaveBeenCalledTimes(1);
      if (mode === 'replacement') {
        await select(3);
      } else {
        effects.forEach((effect) => effect());
        channelId = undefined;
        render();
        effects.forEach((effect) => effect());
      }
      expect(raw.tracks[0]!.readyState).toBe('ended');
      expect(oldTransport.closed).toBe(true);
      const current = send.current;
      const stream = render().localAudioStream;
      const late = producer();
      if (result === 'resolve') pending.resolve(late);
      else pending.reject(new Error('native produce failed'));
      await old;
      if (result === 'resolve') expect(late.close).toHaveBeenCalledTimes(1);
      expect(leaveVoice).not.toHaveBeenCalled();
      expect(errorToast).not.toHaveBeenCalled();
      expect(send.current).toBe(current);
      expect(render().localAudioStream).toBe(stream);
      expect(render().loading).toBe(false);
      if (current) expect(current.closed).toBe(false);
    });
  }
}

test('late A completion keeps B pending disposer registered for leave', async () => {
  devices.noiseGateEnabled = true;
  const a = deferred<Awaited<ReturnType<typeof gate>>>();
  const b = deferred<Awaited<ReturnType<typeof gate>>>();
  gate
    .mockImplementationOnce(() => a.promise)
    .mockImplementationOnce(() => b.promise);
  const rawA = new Stream();
  const rawB = new Stream();
  capture
    .mockImplementationOnce(async () => rawA)
    .mockImplementationOnce(async () => rawB);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  const replacement = voice.init({}, 2).catch(() => {});
  await flush();
  expect(rawA.tracks[0]!.readyState).toBe('ended');
  expect(contexts[0]!.closed).toBe(true);
  expect(rawB.tracks[0]!.readyState).toBe('live');
  expect(contexts[1]!.closed).toBe(false);
  a.resolve({ connect() {}, disconnect: mock(() => {}) });
  await old;
  effects.forEach((effect) => effect());
  channelId = undefined;
  render();
  effects.forEach((effect) => effect());
  expect(rawB.tracks[0]!.readyState).toBe('ended');
  expect(contexts[1]!.closed).toBe(true);
  const lateB = { connect() {}, disconnect: mock(() => {}) };
  b.resolve(lateB);
  await replacement;
  expect(lateB.disconnect).toHaveBeenCalled();
});

test('late A capture cannot publish into B or replace B microphone', async () => {
  const pending = deferred<Stream>();
  const a = new Stream();
  const b = new Stream();
  capture
    .mockImplementationOnce(() => pending.promise)
    .mockImplementationOnce(async () => b);
  const old = voice.init({}, 1).catch(() => {});
  await flush();
  await voice.init({}, 2);
  const current = send.current!;
  pending.resolve(a);
  await old;
  expect(current.produce).toHaveBeenCalledTimes(1);
  expect(render().localAudioStream).toBe(b as unknown as MediaStream);
  expect(a.tracks[0]!.readyState).toBe('ended');
  expect(b.tracks[0]!.readyState).toBe('live');
});
