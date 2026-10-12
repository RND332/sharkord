import { useVoiceRefs } from '@/components/channel-view/voice/hooks/use-voice-refs';
import { StreamKind } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  stream: undefined as MediaStream | undefined,
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
    remoteUserStreams: { 2: { [StreamKind.SCREEN]: state.stream } },
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
