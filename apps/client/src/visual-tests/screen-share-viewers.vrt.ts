import { ScreenShareCard } from '@/components/channel-view/voice/screen-share-card';
import { ThemeProvider } from '@/components/theme-provider';
import { VolumeControlProvider } from '@/components/voice-provider/volume-control-context';
import { i18n } from '@/i18n';
import { StreamKind } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const users = [
  { id: 2, name: 'aria' },
  { id: 3, name: 'jules' },
  { id: 4, name: 'mika' },
  { id: 5, name: 'alex' },
  { id: 6, name: 'rnd332' }
];

vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: { voiceOnlyMode: false, playbackVolume: 100 } })
}));
vi.mock('@/features/server/users/hooks', () => ({
  useUserById: (userId: number) => users.find((user) => user.id === userId),
  useUsers: () => users,
  useOwnUserId: () => 1,
  useIsOwnUser: (userId: number) => userId === 1
}));
vi.mock('@/features/server/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/server/hooks')>()),
  useWebRtcSimulcastEnabled: () => false,
  useOwnVoiceUser: () => undefined,
  useCan: () => () => true,
  useChannelCan: () => () => true,
  usePublicServerSettings: () => undefined,
  useHiddenPluginComponents: () => []
}));
vi.mock('@/components/voice-provider/demo-visibility-context', () => {
  const isViewingDemo = () => false;
  return {
    useDemoVisibility: () => ({
      viewedRemoteDemos: {},
      isViewingDemo,
      viewDemo: async () => {},
      stopViewingDemo: async () => {}
    })
  };
});
vi.mock('@/features/server/voice/hooks', () => ({
  usePinnedCard: () => undefined,
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
    }),
    getConsumerCodec: () => undefined,
    getStreamQuality: () => ({ mode: 'auto' }),
    getStreamQualityLayers: () => [],
    isSimulcastConsumer: () => false
  })
}));

let root: Root | undefined;
let host: HTMLDivElement | undefined;

const mount = async (viewerIds: number[]) => {
  localStorage.setItem('vite-ui-theme', 'dark');
  await i18n.changeLanguage('en');
  host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:24px;top:24px;width:640px;height:360px';
  document.body.append(host);
  root = createRoot(host);
  root.render(
    createElement(
      ThemeProvider,
      null,
      createElement(
        VolumeControlProvider,
        null,
        createElement(ScreenShareCard, {
          userId: 2,
          cardId: 'screen-share-2',
          viewerIds,
          isPinned: false,
          isAnyCardPinned: false,
          showPinControls: true,
          onPin: () => {},
          onUnpin: () => {}
        })
      )
    )
  );
  await document.fonts.ready;
};

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  localStorage.removeItem('vite-ui-theme');
});

test('shows up to four watchers with an overflow count and the full roster on demand', async () => {
  await mount([2, 3, 4, 5, 6]);

  const trigger = page.getByRole('button', { name: '5 viewers' });
  await expect.element(trigger).toBeVisible();
  expect(host!.querySelectorAll('[data-slot="avatar"]')).toHaveLength(4);
  expect(trigger.element().textContent).toContain('+1');
  expect(trigger.element().textContent).toContain('5');

  await trigger.click();
  await expect.element(page.getByText('Watching · 5')).toBeVisible();
  expect(
    host!.ownerDocument.querySelectorAll(
      '[data-slot="popover-content"] [data-slot="avatar"]'
    )
  ).toHaveLength(5);
  await expect.element(page.getByText('aria', { exact: true })).toBeVisible();

  await page
    .getByText('Watching · 5')
    .element()
    .dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
  await expect.element(page.getByText('Watching · 5')).not.toBeInTheDocument();
});

test('hides the watcher control when nobody is watching', async () => {
  await mount([]);
  expect(page.getByRole('button', { name: /viewers/ }).elements()).toHaveLength(
    0
  );
});

void StreamKind;
