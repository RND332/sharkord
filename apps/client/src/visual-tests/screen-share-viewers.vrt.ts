import { StreamViewersList } from '@/components/channel-view/voice/stream-viewers-list';
import { ThemeProvider } from '@/components/theme-provider';
import { i18n } from '@/i18n';
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
      createElement(StreamViewersList, { viewerIds })
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

test('shows up to three watchers with an overflow count and the full roster on demand', async () => {
  await mount([2, 3, 4, 5, 6]);

  const trigger = page.getByRole('button', { name: '5 viewers' });
  await expect.element(trigger).toBeVisible();
  expect(host!.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);
  expect(trigger.element().textContent).toContain('+2');
  // the count is part of the accessible name, not a painted number
  expect(trigger.element().textContent).not.toContain('5');

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

test('renders no watcher control without viewers', async () => {
  await mount([]);

  // the design shows the roster only when someone is watching: an empty chip
  // would be a control without content
  expect(host!.querySelectorAll('[data-slot="avatar"]')).toHaveLength(0);
  expect(host!.querySelector('button')).toBeNull();
});
