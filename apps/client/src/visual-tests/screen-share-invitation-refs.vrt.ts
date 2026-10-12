import { useVoiceRefs } from '@/components/channel-view/voice/hooks/use-voice-refs';
import { StreamKind } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  stream: undefined as MediaStream | undefined,
  audioStream: undefined as MediaStream | undefined,
  videoRef: { current: null as HTMLVideoElement | null },
  audioRef: { current: null as HTMLAudioElement | null }
}));
vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: {} })
}));
vi.mock('@/features/server/users/hooks', () => ({ useIsOwnUser: () => false }));
vi.mock('@/components/channel-view/voice/hooks/use-audio-level', () => ({
  useAudioLevel: () => ({})
}));
vi.mock('@/components/voice-provider/volume-control-context', () => ({
  useVolumeControl: () => ({
    getVolume: () => 100,
    getUserVolumeKey: () => 'user',
    getUserScreenVolumeKey: () => 'screen',
    getExternalVolumeKey: () => 'external'
  })
}));
vi.mock('@/features/server/voice/hooks', () => ({
  useVoice: () => ({
    remoteUserStreams: {
      2: {
        [StreamKind.SCREEN]: state.stream,
        [StreamKind.SCREEN_AUDIO]: state.audioStream
      }
    },
    externalStreams: {},
    ownVoiceState: { soundMuted: false },
    getOrCreateRefs: () => ({
      screenShareRef: state.videoRef,
      screenShareAudioRef: state.audioRef,
      audioRef: { current: null },
      videoRef: { current: null },
      externalAudioRef: { current: null },
      externalVideoRef: { current: null }
    })
  })
}));

test('resumed viewing attaches the retained production stream to the remounted video', async () => {
  const canvas = document.createElement('canvas');
  state.stream = canvas.captureStream();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const Harness = ({ viewing }: { viewing: boolean }) => {
    // Existing callers may ignore the third argument until visibility is supported.
    const refs = Reflect.apply(useVoiceRefs, undefined, [
      2,
      undefined,
      viewing
    ]);
    return viewing
      ? createElement('video', { ref: refs.screenShareRef })
      : null;
  };
  const render = async (viewing: boolean) => {
    root.render(createElement(Harness, { viewing }));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  };
  try {
    await render(true);
    await expect
      .poll(() => state.videoRef.current?.srcObject)
      .toBe(state.stream);
    await render(false);
    await render(true);
    await expect
      .poll(() => state.videoRef.current?.srcObject)
      .toBe(state.stream);
  } finally {
    root.unmount();
    host.remove();
    state.stream.getTracks().forEach((track) => track.stop());
  }
});

test('restarted presenter video and audio streams attach to their browser elements', async () => {
  const createStreams = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 36;
    const video = canvas.captureStream(1);
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const oscillator = audioContext.createOscillator();
    oscillator.connect(destination);
    oscillator.start();
    return { video, audio: destination.stream, audioContext, oscillator };
  };
  const first = createStreams();
  const replacement = createStreams();
  state.stream = first.video;
  state.audioStream = first.audio;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const Harness = ({ viewing }: { viewing: boolean }) => {
    const refs = Reflect.apply(useVoiceRefs, undefined, [
      2,
      undefined,
      viewing
    ]);
    return viewing
      ? createElement(
          'div',
          null,
          createElement('video', { ref: refs.screenShareRef }),
          createElement('audio', { ref: refs.screenShareAudioRef })
        )
      : null;
  };
  const render = async () => {
    root.render(createElement(Harness, { viewing: true }));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  };
  try {
    await render();
    await expect
      .poll(() => state.videoRef.current?.srcObject)
      .toBe(first.video);
    await expect
      .poll(() => state.audioRef.current?.srcObject)
      .toBe(first.audio);

    state.stream = replacement.video;
    state.audioStream = replacement.audio;
    await render();

    await expect
      .poll(() => state.videoRef.current?.srcObject)
      .toBe(replacement.video);
    await expect
      .poll(() => state.audioRef.current?.srcObject)
      .toBe(replacement.audio);
  } finally {
    root.unmount();
    host.remove();
    for (const streams of [first, replacement]) {
      streams.video.getTracks().forEach((track) => track.stop());
      streams.audio.getTracks().forEach((track) => track.stop());
      streams.oscillator.stop();
      await streams.audioContext.close();
    }
    state.stream = undefined;
    state.audioStream = undefined;
  }
});
