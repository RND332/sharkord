import { StreamKind } from '@dodecagon/shared';
import { beforeEach, expect, mock, test } from 'bun:test';
import * as React from 'react';

let slots: unknown[] = [];
let cursor = 0;
let effects: (() => void | (() => void))[] = [];
let currentVoiceChannelId: number | undefined;
let voiceChannelState: { users: Record<number, { sharingScreen?: boolean }> };
let voice: ReturnType<typeof createVoice>;

mock.module('react', () => ({
  ...React,
  memo: <T>(value: T) => value,
  useRef: <T>(initial: T) => {
    const index = cursor++;
    return (slots[index] ??= { current: initial }) as { current: T };
  },
  useState: <T>(initial: T) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [
      slots[index] as T,
      (next: T | ((previous: T) => T)) => {
        const previous = slots[index] as T;
        slots[index] =
          typeof next === 'function'
            ? (next as (previous: T) => T)(previous)
            : next;
      }
    ] as const;
  },
  useCallback: <T>(callback: T) => callback,
  useEffect: (effect: () => void | (() => void)) => {
    effects.push(effect);
  }
}));
mock.module('@/features/server/channels/hooks', () => ({
  useCurrentVoiceChannelId: () => currentVoiceChannelId
}));
mock.module('@/features/server/voice/hooks', () => ({
  useVoice: () => voice
}));
mock.module('@/features/server/voice/selectors', () => ({
  voiceChannelStateSelector: () => voiceChannelState
}));
mock.module('@/features/store', () => ({}));
mock.module('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({})
}));
mock.module('@/helpers/browser-logger', () => ({
  logVoiceError: () => {}
}));
mock.module('../hooks/use-voice-events', () => ({
  useVoiceEvents: () => {}
}));

function createVoice() {
  const isViewingDemoRef = { current: (_userId: number) => false };
  const voiceOnlyModeRef = { current: false };
  return {
    connectionStatus: 'connected' as 'connected' | 'disconnected',
    consumeRef: {
      current: mock(async (_userId: number, _kind: StreamKind) => {})
    },
    rtpCapabilitiesRef: { current: {} },
    isViewingDemoRef,
    onRemoteDemoStoppedRef: { current: (_userId: number) => {} },
    voiceOnlyModeRef,
    closeRemoteUserProducer: mock(() => {}),
    canConsumeScreen: (userId: number) =>
      !voiceOnlyModeRef.current && isViewingDemoRef.current(userId),
    startReceivingDemo: mock((_userId: number) => false),
    stopReceivingDemo: mock(async (_userId: number) => {}),
    removeRemoteUserStream: mock(() => {}),
    removeExternalStreamTrack: mock(() => {}),
    removeExternalStream: mock(() => {}),
    clearRemoteUserStreamsForUser: mock(() => {})
  };
}

const { DemoVisibilityProvider } = await import('../demo-visibility-context');
const render = () => {
  cursor = 0;
  effects = [];
  const tree = (
    DemoVisibilityProvider as unknown as (props: {
      children: null;
    }) => React.ReactElement<{ value: unknown }>
  )({ children: null });
  const value = tree.props.value as {
    isViewingDemo: (userId: number) => boolean;
    viewDemo: (userId: number) => Promise<void>;
    stopViewingDemo: (userId: number) => Promise<void>;
    clearViewedDemo: (userId: number) => void;
    clearViewedDemos: () => void;
  };
  const pending = effects;
  for (const effect of pending) effect();
  return value;
};

beforeEach(() => {
  slots = [];
  cursor = 0;
  effects = [];
  currentVoiceChannelId = 1;
  voiceChannelState = { users: { 42: { sharingScreen: true } } };
  voice = createVoice();
});

test('first view remains opt-in and consumes screen video and audio only after the request', async () => {
  const value = render();
  expect(value.isViewingDemo(42)).toBe(false);
  expect(voice.consumeRef.current).not.toHaveBeenCalled();

  await value.viewDemo(42);

  expect(value.isViewingDemo(42)).toBe(true);
  expect(voice.consumeRef.current.mock.calls.map((call) => call[1])).toEqual([
    StreamKind.SCREEN,
    StreamKind.SCREEN_AUDIO
  ]);
});

test('presenter stop and restart retains the watch choice while retiring active media', async () => {
  const value = render();
  await value.viewDemo(42);
  voiceChannelState = { users: { 42: { sharingScreen: false } } };

  const afterStop = render();
  expect(afterStop.isViewingDemo(42)).toBe(true);
  expect(voice.stopReceivingDemo).toHaveBeenCalledWith(42);

  voiceChannelState = { users: { 42: { sharingScreen: true } } };
  const afterRestart = render();
  expect(afterRestart.isViewingDemo(42)).toBe(true);
});

test('explicit stop watching retires consent and active media', async () => {
  const value = render();
  await value.viewDemo(42);
  await value.stopViewingDemo(42);

  expect(value.isViewingDemo(42)).toBe(false);
  expect(voice.stopReceivingDemo).toHaveBeenCalledWith(42);
});

test('voice-only mode cancels prior watch consent and prevents re-opt-in', async () => {
  const value = render();
  await value.viewDemo(42);
  voice.voiceOnlyModeRef.current = true;

  const audioOnly = render();
  expect(audioOnly.isViewingDemo(42)).toBe(false);
  expect(voice.stopReceivingDemo).toHaveBeenCalledWith(42);
  await audioOnly.viewDemo(42);
  expect(audioOnly.isViewingDemo(42)).toBe(false);
});

test('voice channel change and disconnect retire session-scoped watch choices', async () => {
  let value = render();
  await value.viewDemo(42);
  currentVoiceChannelId = 2;
  value = render();
  expect(value.isViewingDemo(42)).toBe(false);

  await value.viewDemo(42);
  voice.connectionStatus = 'disconnected';
  value = render();
  expect(value.isViewingDemo(42)).toBe(false);
});

test('remote participant leave explicitly retires that presenter watch choice', async () => {
  const value = render();
  await value.viewDemo(42);
  voiceChannelState = { users: {} };
  const left = render();

  expect(left.isViewingDemo(42)).toBe(false);
  expect(voice.stopReceivingDemo).toHaveBeenCalledWith(42);
});
