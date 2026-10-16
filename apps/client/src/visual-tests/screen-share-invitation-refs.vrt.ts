import { useVoiceRefs } from '@/components/channel-view/voice/hooks/use-voice-refs';
import { StreamKind } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  stream: undefined as MediaStream | undefined,
  audioStream: undefined as MediaStream | undefined,
  playbackVolume: 100,
  volumes: { user: 100, screen: 100, external: 100 } as Record<string, number>,
  voiceAudioRef: { current: null as HTMLAudioElement | null },
  externalAudioRef: { current: null as HTMLAudioElement | null },
  videoRef: { current: null as HTMLVideoElement | null },
  audioRef: { current: null as HTMLAudioElement | null }
}));
vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: { playbackVolume: state.playbackVolume } })
}));
vi.mock('@/features/server/users/hooks', () => ({ useIsOwnUser: () => false }));
vi.mock('@/components/channel-view/voice/hooks/use-audio-level', () => ({
  useAudioLevel: () => ({})
}));
vi.mock('@/components/voice-provider/volume-control-context', () => ({
  useVolumeControl: () => ({
    getVolume: (key: string) => state.volumes[key],
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
        [StreamKind.SCREEN_AUDIO]: state.audioStream,
        [StreamKind.AUDIO]: state.audioStream
      }
    },
    externalStreams: { 2: { audioStream: state.audioStream } },
    ownVoiceState: { soundMuted: false },
    getOrCreateRefs: () => ({
      screenShareRef: state.videoRef,
      screenShareAudioRef: state.audioRef,
      audioRef: state.voiceAudioRef,
      videoRef: { current: null },
      externalAudioRef: state.externalAudioRef,
      externalVideoRef: { current: null }
    })
  })
}));

test('output volume scales voice, screen and external playback independently and updates live', async () => {
  const context = new AudioContext();
  state.audioStream = context.createMediaStreamDestination().stream;
  state.playbackVolume = 50;
  state.volumes = { user: 40, screen: 60, external: 80 };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const Harness = () => {
    const refs = useVoiceRefs(
      2,
      { pluginId: 'fixture', streamKey: 'music' },
      true
    );
    return createElement(
      'div',
      null,
      createElement('audio', { ref: refs.audioRef }),
      createElement('audio', { ref: refs.screenShareAudioRef }),
      createElement('audio', { ref: refs.externalAudioRef })
    );
  };
  const render = async () => {
    root.render(createElement(Harness));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  };
  const volumes = () =>
    Array.from(host.querySelectorAll('audio'), (audio) => audio.volume);
  try {
    await render();
    expect(volumes()).toEqual([0.2, 0.3, 0.4]);
    state.playbackVolume = 0;
    await render();
    expect(volumes()).toEqual([0, 0, 0]);
    state.playbackVolume = 100;
    await render();
    expect(volumes()).toEqual([0.4, 0.6, 0.8]);
    for (const audio of host.querySelectorAll('audio'))
      expect(audio.srcObject).toBe(state.audioStream);
  } finally {
    root.unmount();
    host.remove();
    state.audioStream = undefined;
    state.playbackVolume = 100;
    state.volumes = { user: 100, screen: 100, external: 100 };
    await context.close();
  }
});

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
