import { VoiceChannel } from '@/components/channel-view/voice';
import { ScreenShareCard } from '@/components/channel-view/voice/screen-share-card';
import '@fontsource-variable/inter';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const state = vi.hoisted(() => ({
  ownId: 1,
  viewing: false,
  hasStream: false,
  visibilityListeners: [] as (() => void)[],
  voiceOnlyMode: false,
  viewDemo: vi.fn(async (_id: number) => {}),
  stopViewingDemo: vi.fn(async (_id: number) => {})
}));
vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({ devices: { voiceOnlyMode: state.voiceOnlyMode } })
}));
vi.mock('@/components/voice-provider/demo-visibility-context', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    state.visibilityListeners.push(listener);
    return () => {
      state.visibilityListeners = state.visibilityListeners.filter(
        (entry) => entry !== listener
      );
    };
  };
  return {
    useDemoVisibility: () => {
      const viewing = useSyncExternalStore(subscribe, () => state.viewing);
      return {
        isViewingDemo: () => viewing,
        viewDemo: state.viewDemo,
        stopViewingDemo: state.stopViewingDemo,
        viewedRemoteDemos: viewing ? { 2: true } : {}
      };
    }
  };
});
vi.mock('@/features/server/users/hooks', () => ({
  useUserById: () => ({ id: 2, name: 'aria' }),
  useOwnUserId: () => state.ownId
}));
vi.mock('@/features/server/hooks', () => ({
  useWebRtcSimulcastEnabled: () => false,
  useVoiceUsersByChannelId: () => [
    { id: 2, name: 'aria', state: { sharingScreen: true } }
  ]
}));
vi.mock('@/features/server/voice/hooks', () => ({
  useVoice: () => ({ getConsumerCodec: () => undefined }),
  useHideNonVideoParticipants: () => false,
  useHideOwnScreenShare: () => false,
  useVoiceChannelExternalStreamsList: () => []
}));
vi.mock('@/components/voice-provider/stats-context', () => ({
  useVoiceStats: () => ({})
}));
vi.mock('@/components/voice-provider/volume-control-context', () => ({
  useVolumeControl: () => ({ getUserScreenVolumeKey: () => 'screen:2' })
}));
vi.mock('@/hooks/use-stream-quality-data', () => ({
  useStreamQualityData: () => ({})
}));
vi.mock('@/components/channel-view/voice/hooks/use-video-stats', () => ({
  useVideoStats: () => null
}));
vi.mock('@/components/channel-view/voice/hooks/use-voice-refs', () => ({
  useVoiceRefs: () => ({
    screenShareRef: { current: null },
    screenShareAudioRef: { current: null },
    hasScreenShareStream: state.hasStream,
    hasScreenShareAudioStream: false
  })
}));
vi.mock('@/components/channel-view/voice/picture-in-picture-button', () => ({
  PictureInPictureButton: () => null
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));
vi.mock(
  '@/components/channel-view/voice/hooks/use-pin-card-controller',
  () => ({
    PinnedCardType: { SCREEN_SHARE: 'screen_share' },
    usePinCardController: () => ({
      pinCard: vi.fn(),
      unpinCard: vi.fn(),
      isPinned: () => false
    })
  })
);
vi.mock('@/components/channel-view/voice/voice-user-card', () => ({
  VoiceUserCard: () =>
    createElement('div', { 'data-participant': true }, 'aria')
}));
vi.mock('@/components/channel-view/voice/controls-bar', () => ({
  ControlsBar: () => null
}));
vi.mock('@/components/channel-view/voice/external-stream-card', () => ({
  ExternalStreamCard: () => null
}));

let root: Root;
const pin = vi.fn();
const render = async (channel = false) => {
  document.documentElement.classList.add('dark');
  if (!root) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:345px;height:194px';
    document.body.append(host);
    root = createRoot(host);
  }
  state.visibilityListeners.forEach((listener) => listener());
  root.render(
    channel
      ? createElement(VoiceChannel, { channelId: 2 })
      : createElement(ScreenShareCard, {
          userId: 2,
          cardId: 'screen-share-2',
          onPin: pin,
          onUnpin: vi.fn(),
          showPinControls: true
        })
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};
afterEach(() => {
  root?.unmount();
  root = undefined!;
  document.body.replaceChildren();
  state.ownId = 1;
  state.viewing = false;
  state.hasStream = false;
  state.visibilityListeners = [];
  state.voiceOnlyMode = false;
  vi.useRealTimers();
  vi.clearAllMocks();
  state.viewDemo.mockImplementation(async () => {
    state.viewing = true;
  });
});

test('watching and stopping a stream keep the same card shell and caption geometry', async () => {
  await render();
  const beforeCaption = page
    .getByText("aria's screen", { exact: true })
    .element();
  const beforeTile = beforeCaption.parentElement!.parentElement!;
  const beforeRect = beforeTile.getBoundingClientRect();
  const beforeStyle = getComputedStyle(beforeTile);
  const radius = beforeStyle.borderRadius;
  const border = beforeStyle.borderColor;
  const captionRect = beforeCaption.getBoundingClientRect();
  state.viewing = true;
  state.hasStream = true;
  await render();
  const afterCaption = page
    .getByText("aria's screen", { exact: true })
    .element();
  const afterTile = afterCaption.parentElement!.parentElement!;
  expect(getComputedStyle(afterTile).borderRadius).toBe(radius);
  expect(getComputedStyle(afterTile).borderColor).toBe(border);
  expect(afterTile.getBoundingClientRect().width).toBe(beforeRect.width);
  expect(afterTile.getBoundingClientRect().height).toBe(beforeRect.height);
  expect(afterCaption.getBoundingClientRect().x).toBe(captionRect.x);
  expect(afterCaption.getBoundingClientRect().y).toBe(captionRect.y);
  state.viewing = false;
  await render();
  const stoppedCaption = page
    .getByText("aria's screen", { exact: true })
    .element();
  expect(stoppedCaption.getBoundingClientRect().y).toBe(captionRect.y);
  expect(document.querySelector('video')).toBeNull();
});

test('starting and stopping viewing does not resize the channel tiles', async () => {
  await render(true);
  const tile = document.querySelector('[data-screen-share-card]')!;
  const stage = tile.closest('[class~="group/voice-stage"]')!;
  (stage.parentElement as HTMLElement).style.cssText =
    'position:fixed;left:0;top:0;width:1292px;height:720px';
  await render(true);
  const initial = document
    .querySelector('[data-screen-share-card]')!
    .getBoundingClientRect();
  state.viewing = true;
  state.hasStream = true;
  await render(true);
  const watched = document
    .querySelector('[data-screen-share-card]')!
    .getBoundingClientRect();
  expect(watched.width).toBe(initial.width);
  expect(watched.height).toBe(initial.height);
  expect(watched.x).toBe(initial.x);
  expect(watched.y).toBe(initial.y);
  state.viewing = false;
  await render(true);
  const stopped = document
    .querySelector('[data-screen-share-card]')!
    .getBoundingClientRect();
  expect(stopped.width).toBe(initial.width);
  expect(stopped.height).toBe(initial.height);
});

test('channel includes both the normal participant and a separate invitation before watching', async () => {
  await render(true);
  expect(document.querySelectorAll('[data-participant]')).toHaveLength(1);
  await expect
    .element(page.getByRole('button', { name: 'Watch stream', exact: true }))
    .toBeVisible();
  expect(state.viewDemo).not.toHaveBeenCalled();
});

test('watched media returns to the invitation after production stop even with a stale stream', async () => {
  state.viewing = true;
  state.hasStream = true;
  await render();
  expect(document.querySelector('video')).not.toBeNull();
  await page
    .elementLocator(document.querySelector('video')!.parentElement!)
    .hover();
  await page
    .getByRole('button', { name: 'stopViewingDemo', exact: true })
    .click();
  expect(state.stopViewingDemo).toHaveBeenCalledWith(2);
  state.viewing = false;
  await render();
  await expect
    .element(page.getByRole('button', { name: 'Watch stream', exact: true }))
    .toBeVisible();
  expect(document.querySelector('video')).toBeNull();
});

test('a previously watched presenter reconnects automatically without a second watch click', async () => {
  state.viewing = true;
  await render();

  await expect
    .element(page.getByRole('button', { name: 'Connecting…' }))
    .toBeDisabled();
  expect(state.viewDemo).not.toHaveBeenCalled();

  state.hasStream = true;
  await render();
  expect(document.querySelector('video')).not.toBeNull();
});

test('own share immediately previews local media without a watch invitation', async () => {
  state.ownId = 2;
  state.hasStream = true;
  await render();
  expect(document.querySelector('video')).not.toBeNull();
  expect(
    page.getByRole('button', { name: 'Watch stream', exact: true }).query()
  ).toBeNull();
  expect(state.viewDemo).not.toHaveBeenCalled();
});

test('invitation appearance matches the approved Paper tile', async () => {
  await render();
  await document.fonts.ready;
  await expect(page.elementLocator(document.documentElement)).toMatchScreenshot(
    'screen-share-invitation'
  );
});

test('successful opt-in shows arriving media without pinning', async () => {
  state.viewDemo.mockImplementation(async () => {
    state.viewing = true;
  });
  await render();
  await page.getByRole('button', { name: 'Watch stream', exact: true }).click();
  await render();
  expect(
    page
      .getByRole('button', { name: 'Connecting…' })
      .element()
      .hasAttribute('disabled')
  ).toBe(true);
  state.hasStream = true;
  await render();
  expect(document.querySelector('video')).not.toBeNull();
  expect(pin).not.toHaveBeenCalled();
});

test('late rejected watch cannot roll back a replacement tile subscription', async () => {
  let reject!: (error: Error) => void;
  state.viewDemo.mockImplementationOnce(
    () =>
      new Promise<void>((_, fail) => {
        reject = fail;
      })
  );
  await render();
  await page.getByRole('button', { name: 'Watch stream', exact: true }).click();
  root.unmount();
  root = undefined!;
  document.body.replaceChildren();
  await render();
  reject(new Error('retired request'));
  await render();
  expect(state.stopViewingDemo).not.toHaveBeenCalled();
  expect(page.getByRole('alert').query()).toBeNull();
});

test('watch remains loading until media arrives and times out into an accessible retry', async () => {
  await render();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await page.getByRole('button', { name: 'Watch stream', exact: true }).click();
  await render();
  expect(
    page
      .getByRole('button', { name: 'Connecting…' })
      .element()
      .hasAttribute('disabled')
  ).toBe(true);
  await vi.advanceTimersByTimeAsync(15_000);
  await render();
  expect(page.getByRole('alert').element().textContent).toContain(
    'Unable to watch stream'
  );
  expect(state.stopViewingDemo).toHaveBeenCalledWith(2);
});

test('watch calls the production opt-in and exposes loading, failure and retry without pinning', async () => {
  let reject!: (reason: Error) => void;
  state.viewDemo.mockImplementationOnce(() => {
    state.viewing = true;
    return new Promise<void>((_, fail) => {
      reject = fail;
    });
  });
  await render();
  await page.getByRole('button', { name: 'Watch stream', exact: true }).click();
  expect(state.viewDemo).toHaveBeenCalledWith(2);
  await expect
    .element(page.getByRole('button', { name: 'Connecting…' }))
    .toBeDisabled();
  reject(new Error('transport failed'));
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Unable to watch stream. Try again.');
  await page.getByRole('button', { name: 'Retry watch stream' }).click();
  expect(state.viewDemo).toHaveBeenCalledTimes(2);
  expect(pin).not.toHaveBeenCalled();
});

test('unwatched share shows the approved invitation without subscribing or pinning', async () => {
  await render();
  await expect
    .element(page.getByRole('button', { name: 'Watch stream', exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByText("aria's screen", { exact: true }))
    .toBeVisible();
  expect(document.querySelector('video')).toBeNull();
  expect(document.body.textContent).not.toContain('LIVE');
  expect(state.viewDemo).not.toHaveBeenCalled();
  expect(pin).not.toHaveBeenCalled();
  const button = page
    .getByRole('button', { name: 'Watch stream', exact: true })
    .element();
  const tile = button.closest('[data-screen-share-card]')!;
  const styles = getComputedStyle(button);
  expect(styles.height).toBe('36px');
  expect(styles.paddingLeft).toBe('16px');
  expect(styles.gap).toBe('8px');
  expect(styles.borderRadius).toBe('6px');
  expect(styles.backgroundColor).toBe('rgb(64, 66, 73)');
  expect(styles.color).toBe('rgb(242, 243, 245)');
  expect(styles.fontSize).toBe('14px');
  expect(styles.lineHeight).toBe('20px');
  expect(styles.fontWeight).toBe('500');
  expect(getComputedStyle(tile).backgroundColor).toBe('rgb(43, 45, 49)');
  expect(getComputedStyle(tile).borderColor).toBe('rgb(68, 70, 77)');
  expect(getComputedStyle(tile).borderRadius).toBe('12px');
  expect(
    button.getBoundingClientRect().x + button.getBoundingClientRect().width / 2
  ).toBeCloseTo(
    tile.getBoundingClientRect().x + tile.getBoundingClientRect().width / 2,
    0
  );
});
