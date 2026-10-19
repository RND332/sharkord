import { ScreenShareCard } from '@/components/channel-view/voice/screen-share-card';
import { ThemeProvider } from '@/components/theme-provider';
import { VolumeControlProvider } from '@/components/voice-provider/volume-control-context';
import { i18n } from '@/i18n';
import '@fontsource-variable/inter';
import { StreamKind } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const state = vi.hoisted(() => ({
  name: 'aria',
  viewing: true,
  watchError: false,
  revision: 0,
  listeners: new Set<() => void>(),
  streams: {} as Record<number, Partial<Record<StreamKind, MediaStream>>>,
  refs: {
    screenShareRef: { current: null as HTMLVideoElement | null },
    screenShareAudioRef: { current: null as HTMLAudioElement | null },
    videoRef: { current: null as HTMLVideoElement | null },
    audioRef: { current: null as HTMLAudioElement | null },
    externalVideoRef: { current: null as HTMLVideoElement | null },
    externalAudioRef: { current: null as HTMLAudioElement | null }
  }
}));

const notify = () => {
  state.revision++;
  state.listeners.forEach((listener) => listener());
};

vi.mock('@/components/devices-provider/hooks/use-devices', () => ({
  useDevices: () => ({
    devices: { voiceOnlyMode: false, playbackVolume: 100 }
  })
}));
vi.mock('@/features/server/users/hooks', () => ({
  useUserById: (userId: number) => ({ id: userId, name: state.name }),
  useUsers: () => [{ id: 2, name: state.name }],
  useOwnUserId: () => 1,
  useIsOwnUser: () => false
}));
vi.mock('@/features/server/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/server/hooks')>()),
  useWebRtcSimulcastEnabled: () => true,
  useOwnVoiceUser: () => undefined,
  useCan: () => () => true,
  useChannelCan: () => () => true,
  usePublicServerSettings: () => undefined,
  useHiddenPluginComponents: () => []
}));
vi.mock('@/features/server/voice/hooks', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  };
  const getConsumerCodec = () => 'video/VP8';
  const getStreamQuality = () => ({ mode: 'auto' });
  const getStreamQualityLayers = () => [];
  const isSimulcastConsumer = () => false;
  const getOrCreateRefs = () => state.refs;
  return {
    usePinnedCard: () => undefined,
    useVoice: () => {
      useSyncExternalStore(subscribe, () => state.revision);
      return {
        remoteUserStreams: state.streams,
        externalStreams: {},
        ownVoiceState: { soundMuted: false },
        getOrCreateRefs,
        getConsumerCodec,
        getStreamQuality,
        getStreamQualityLayers,
        isSimulcastConsumer
      };
    }
  };
});
vi.mock('@/components/voice-provider/demo-visibility-context', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  };
  const isViewingDemo = () => state.viewing;
  const publish = () => {
    state.revision++;
    state.listeners.forEach((listener) => listener());
  };
  const viewDemo = async () => {
    if (state.watchError) throw new Error('fixture transport rejection');
    state.viewing = true;
    publish();
  };
  const stopViewingDemo = async () => {
    state.viewing = false;
    publish();
  };
  return {
    useDemoVisibility: () => {
      useSyncExternalStore(subscribe, () => state.revision);
      return { isViewingDemo, viewDemo, stopViewingDemo };
    }
  };
});

let root: Root | undefined;
let host: HTMLDivElement | undefined;
let source: MediaStream | undefined;
let pinned = false;
let compact = false;
const pin = () => {
  pinned = true;
  render();
};
const unpin = () => {
  pinned = false;
  render();
};
const render = () => {
  root!.render(
    createElement(
      ThemeProvider,
      null,
      createElement(
        VolumeControlProvider,
        null,
        createElement(ScreenShareCard, {
          userId: 2,
          cardId: 'screen-share-2',
          isPinned: pinned,
          isAnyCardPinned: compact,
          showPinControls: true,
          onPin: pin,
          onUnpin: unpin
        })
      )
    )
  );
};

const mount = async (width: number, height: number, theme = 'dark') => {
  localStorage.setItem('vite-ui-theme', theme);
  await i18n.changeLanguage('en');
  host = document.createElement('div');
  host.style.cssText = `position:fixed;left:24px;top:24px;width:${width}px;height:${height}px`;
  document.body.append(host);
  root = createRoot(host);
  render();
  await expect.element(page.getByText(/aria's screen/)).toBeVisible();
  await document.fonts.ready;
};

const attachMedia = async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 640, 360);
  context.fillStyle = '#313338';
  context.font = '24px sans-serif';
  context.fillText('Shared screen', 24, 48);
  source = canvas.captureStream(0);
  state.streams = { 2: { [StreamKind.SCREEN]: source } };
  notify();
  await expect
    .poll(() => state.refs.screenShareRef.current?.srcObject)
    .toBe(source);
  const [track] = source.getVideoTracks() as CanvasCaptureMediaStreamTrack[];
  track.requestFrame();
  await expect
    .poll(() => state.refs.screenShareRef.current?.videoWidth)
    .toBe(640);
};

const caption = () => {
  const label = host!.querySelector('p')!;
  return { label, badge: label.parentElement! };
};

const contrastOnBrightMedia = (text: Element, badge: Element) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = getComputedStyle(badge).backgroundColor;
  context.fillRect(0, 0, 1, 1);
  const background = context.getImageData(0, 0, 1, 1).data;
  context.fillStyle = getComputedStyle(text).color;
  context.fillRect(0, 0, 1, 1);
  const foreground = context.getImageData(0, 0, 1, 1).data;
  const luminance = (pixel: Uint8ClampedArray) => {
    const [red, green, blue] = Array.from(pixel.slice(0, 3), (value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  return (luminance(foreground) + 0.05) / (luminance(background) + 0.05);
};

afterEach(async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  root?.unmount();
  host?.remove();
  source?.getTracks().forEach((track) => track.stop());
  root = undefined;
  host = undefined;
  source = undefined;
  pinned = false;
  compact = false;
  state.name = 'aria';
  state.viewing = true;
  state.watchError = false;
  state.streams = {};
  state.listeners.clear();
  localStorage.removeItem('vite-ui-theme');
});

test.each([
  { view: 'focus', width: 640, height: 360, videoWidth: 638, videoHeight: 358 },
  { view: 'grid', width: 345, height: 194, videoWidth: 343, videoHeight: 192 },
  {
    view: 'thumbnail',
    width: 152,
    height: 114,
    videoWidth: 150,
    videoHeight: 112
  }
])(
  '$view video uses the full frame with a bounded 26px overlay',
  async (fixture) => {
    pinned = fixture.view === 'focus';
    compact = fixture.view === 'thumbnail';
    await mount(fixture.width, fixture.height);
    await attachMedia();
    const video = state.refs.screenShareRef.current!;
    const videoRect = video.getBoundingClientRect();
    expect(videoRect.width).toBe(fixture.videoWidth);
    expect(videoRect.height).toBe(fixture.videoHeight);
    expect(video.videoHeight).toBe(360);
    expect(getComputedStyle(video).objectFit).toBe('contain');
    const { badge } = caption();
    const style = getComputedStyle(badge);
    expect(badge.getBoundingClientRect().height).toBe(26);
    expect(style.left).toBe('8px');
    expect(style.bottom).toBe('8px');
    expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(
      fixture.videoWidth - 16
    );
    expect(badge.getBoundingClientRect().bottom).toBe(videoRect.bottom - 8);
  }
);

test('grid stats describe decoded media without requiring a pin', async () => {
  await mount(345, 194);
  await attachMedia();
  await expect
    .poll(() => caption().label.textContent, { timeout: 3_000 })
    .toContain('VP8 640x360');
  expect(pinned).toBe(false);
});

test('compact names truncate before stats without changing thumbnail dimensions', async () => {
  compact = true;
  await mount(152, 114);
  state.name = 'aria with a deliberately long display name';
  await attachMedia();
  const { label, badge } = caption();
  expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(134);
  expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
  expect(getComputedStyle(label).whiteSpace).toBe('nowrap');
  expect(host!.getBoundingClientRect().height).toBe(114);
  await expect
    .poll(() => label.textContent, { timeout: 3_000 })
    .toContain('640x360');
});

test('caption pass-through preserves pinning, fullscreen and retained-stream reattachment', async () => {
  await mount(640, 360);
  await attachMedia();
  const card = page.elementLocator(
    host!.querySelector('[data-screen-share-card]')!
  );
  await card.click({ position: { x: 24, y: 340 } });
  await expect
    .element(page.getByRole('button', { name: 'Unpin aria', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  await card.click({ button: 'right' });
  await expect
    .element(page.getByRole('menuitem', { name: 'Unpin stream', exact: true }))
    .toBeVisible();
  await page.getByRole('menuitem', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => document.fullscreenElement).not.toBeNull();
  expect(
    state.refs.screenShareRef.current!.getBoundingClientRect().height
  ).toBe(document.fullscreenElement!.clientHeight);
  // the existing body-ported menu is outside the native fullscreen top layer.
  await document.exitFullscreen();
  await expect.poll(() => document.fullscreenElement).toBeNull();
  await card.click({ button: 'right' });
  await page
    .getByRole('menuitem', { name: 'Stop watching', exact: true })
    .click();
  await expect
    .element(
      page.getByRole('button', { name: "View aria's screen", exact: true })
    )
    .toBeVisible();
  expect(host!.querySelector('video')).toBeNull();
  expect(caption().badge.getBoundingClientRect().height).toBe(26);
  await page
    .getByRole('button', { name: "View aria's screen", exact: true })
    .click();
  await expect
    .poll(() => state.refs.screenShareRef.current?.srcObject)
    .toBe(source);
  expect(
    state.refs.screenShareRef.current!.getBoundingClientRect().height
  ).toBe(358);
});

for (const theme of ['light', 'hatsune-miku']) {
  test(`${theme} keeps bright-media captions readable`, async () => {
    await mount(640, 360, theme);
    await attachMedia();
    await expect
      .poll(() => caption().label.textContent, { timeout: 3_000 })
      .toContain('640x360');
    await expect
      .poll(() => caption().label.textContent, { timeout: 3_000 })
      .not.toMatch(/\dfps/);
    const { label, badge } = caption();
    expect(getComputedStyle(label).color).toBe('rgb(255, 255, 255)');
    const stats = label.querySelector('span')!;
    const nameContrast = contrastOnBrightMedia(label, badge);
    const statsContrast = contrastOnBrightMedia(stats, badge);
    console.info(`${theme} bright-media contrast`, {
      nameContrast,
      statsContrast
    });
    expect(nameContrast).toBeGreaterThanOrEqual(4.5);
    expect(statsContrast).toBeGreaterThanOrEqual(4.5);
    expect(getComputedStyle(badge).pointerEvents).toBe('none');
    await page
      .elementLocator(document.documentElement)
      .hover({ position: { x: 780, y: 580 } });
    await expect(
      page.elementLocator(document.documentElement)
    ).toMatchScreenshot(`screen-share-overlay-${theme}`);
  });
}
