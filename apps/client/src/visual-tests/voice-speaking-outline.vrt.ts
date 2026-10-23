import { VoiceUserCard } from '@/components/channel-view/voice/voice-user-card';
import { ThemeProvider } from '@/components/theme-provider';
import { VolumeControlProvider } from '@/components/voice-provider/volume-control-context';
import type { TVoiceUser } from '@/features/server/types';
import { i18n } from '@/i18n';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import '../index.css';

const SUCCESS_BORDER = 'rgb(87, 209, 138)';
const LINE_BORDER = 'rgb(68, 70, 77)';

const speaking = vi.hoisted(() => ({ active: true, intensity: 4 }));

vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: { voiceOnlyMode: false, playbackVolume: 100 } })
}));

vi.mock('@/components/plugin-slot-renderer', () => ({
  PluginSlotRenderer: () => null
}));

vi.mock('@/components/voice-provider/demo-visibility-context', () => ({
  useDemoVisibility: () => ({
    viewedRemoteDemos: {},
    isViewingDemo: () => false,
    viewDemo: async () => {},
    stopViewingDemo: async () => {}
  })
}));

vi.mock('@/components/voice-provider/remote-webcam-visibility-context', () => ({
  useRemoteWebcamVisibility: () => ({
    isWebcamHidden: () => false,
    toggleWebcamHidden: () => {}
  })
}));

vi.mock('@/features/server/users/hooks', () => ({
  useUserById: (userId: number) => ({
    id: userId,
    name: 'aria',
    avatar: null,
    avatarId: 0,
    profileColor: '#5865F2'
  }),
  useUsers: () => [],
  useOwnUserId: () => 1,
  useIsOwnUser: (userId: number) => userId === 1
}));

vi.mock('@/features/server/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/server/hooks')>()),
  useWebRtcSimulcastEnabled: () => false
}));

vi.mock('@/features/server/voice/hooks', () => ({
  // Mirrors the real hook: a remote participant speaks while the audio level
  // reports activity, the own user only speaks while unmuted.
  useSpeakingState: (userId: number) => ({
    isActivelySpeaking: speaking.active && userId !== 1,
    speakingIntensity: speaking.intensity
  }),
  useVoice: () => ({
    remoteUserStreams: {},
    externalStreams: {},
    localAudioStream: undefined,
    localVideoStream: undefined,
    localScreenShareStream: undefined,
    ownVoiceState: { soundMuted: false },
    getOrCreateRefs: () => ({
      screenShareRef: { current: null },
      screenShareAudioRef: { current: null },
      videoRef: { current: null },
      audioRef: { current: null },
      externalVideoRef: { current: null },
      externalAudioRef: { current: null }
    })
  }),
  useOwnVoiceState: () => ({ micMuted: false, soundMuted: false }),
  useShowUserBannersInVoice: () => false,
  usePinnedCard: () => undefined,
  useVoiceReactions: () => [],
  useVoiceChannelExternalStreamsList: () => [],
  useVoiceChannelAudioExternalStreams: () => [],
  useVoiceMoveTargetChannelId: () => undefined,
  useHideNonVideoParticipants: () => false,
  useHideOwnScreenShare: () => false,
  useScreenViewers: () => ({})
}));

const voiceUser = {
  id: 2,
  name: 'aria',
  profileColor: '#5865F2',
  bio: '',
  avatar: null,
  avatarId: 0,
  banner: null,
  bannerId: 0,
  banned: false,
  createdAt: new Date(0),
  roleIds: [],
  state: {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  }
} as unknown as TVoiceUser;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

const render = async (showSpeakingOutline: boolean) => {
  localStorage.setItem('vite-ui-theme', 'dark');
  await i18n.changeLanguage('en');
  host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:24px;top:24px;width:320px;height:220px';
  document.body.append(host);
  root = createRoot(host);
  root.render(
    createElement(
      ThemeProvider,
      null,
      createElement(
        VolumeControlProvider,
        null,
        createElement(VoiceUserCard, {
          userId: 2,
          channelId: 2,
          cardId: 'user-2',
          onPin: () => {},
          onUnpin: () => {},
          voiceUser,
          showSpeakingOutline
        })
      )
    )
  );
  await document.fonts.ready;
  await expect.poll(() => tile()).not.toBeNull();
};

const tile = () => host!.querySelector<HTMLElement>('.group\\/voice-user-card');

const avatar = () => host!.querySelector<HTMLElement>('[data-slot="avatar"]');

const tileElement = () => {
  const element = tile();
  if (!element) throw new Error('the voice card is not rendered');
  return element;
};

const avatarElement = () => {
  const element = avatar();
  if (!element) throw new Error('the voice card avatar is not rendered');
  return element;
};

const greenBorders = () =>
  Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
    (element) => getComputedStyle(element).borderTopColor === SUCCESS_BORDER
  );

const unmount = () => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
};

afterEach(() => {
  unmount();
  speaking.active = true;
  speaking.intensity = 4;
  localStorage.removeItem('vite-ui-theme');
});

test('the speaking highlight hugs the card and stays inside its bounds', async () => {
  await render(true);

  const card = tileElement();
  expect(getComputedStyle(card).borderTopColor).toBe(SUCCESS_BORDER);

  const bounds = card.getBoundingClientRect();
  const highlights = greenBorders();
  expect(highlights.length).toBeGreaterThan(0);

  for (const highlight of highlights) {
    const rect = highlight.getBoundingClientRect();
    expect(rect.top).toBeGreaterThanOrEqual(bounds.top - 0.5);
    expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 0.5);
    expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom + 0.5);
    expect(rect.right).toBeLessThanOrEqual(bounds.right + 0.5);
  }
});

test('a silent participant keeps the neutral card border', async () => {
  speaking.active = false;
  await render(true);

  expect(getComputedStyle(tileElement()).borderTopColor).toBe(LINE_BORDER);
  expect(greenBorders()).toHaveLength(0);
});

test('the speaking highlight is dropped together with the hidden overlay chrome', async () => {
  await render(false);

  expect(getComputedStyle(tileElement()).borderTopColor).toBe(LINE_BORDER);
  expect(greenBorders()).toHaveLength(0);
});

test('the speaking outline grows with the voice level', async () => {
  speaking.intensity = 1;
  await render(true);

  expect(getComputedStyle(tileElement()).borderTopWidth).toBe('1px');
  expect(getComputedStyle(avatarElement()).borderTopWidth).toBe('2px');

  unmount();

  speaking.intensity = 4;
  await render(true);

  expect(getComputedStyle(tileElement()).borderTopWidth).toBe('4px');
  expect(getComputedStyle(avatarElement()).borderTopWidth).toBe('4px');
});
