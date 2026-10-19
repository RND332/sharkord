import { getHostFromServer } from '@/helpers/get-file-url';
import { i18n } from '@/i18n';
import { Disconnected } from '@/screens/disconnected';
import { DisconnectCode } from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const actions = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  setDisconnectInfo: vi.fn()
}));

vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => createElement('div', {}, 'English')
}));
vi.mock('@/features/server/hooks', () => ({
  useServerName: () => 'Rnd Community'
}));
vi.mock('@/features/server/actions', () => actions);

let root: Root | undefined;
let host: HTMLDivElement | undefined;

const mount = async () => {
  localStorage.setItem('vite-ui-theme', 'dark');
  await i18n.changeLanguage('en');
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0';
  document.body.append(host);
  root = createRoot(host);
  root.render(
    createElement(Disconnected, {
      info: {
        code: DisconnectCode.UNEXPECTED,
        reason: '',
        wasClean: false,
        time: new Date('2026-10-09T09:40:00.000Z')
      }
    })
  );
  await document.fonts.ready;
};

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  localStorage.removeItem('vite-ui-theme');
  actions.connect.mockClear();
  actions.setDisconnectInfo.mockClear();
});

test('the lost-connection screen shows a truthful retry action, host and attempt time', async () => {
  await mount();

  await expect
    .element(page.getByText('Connection lost', { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Try again' }))
    .toBeVisible();
  await expect
    .element(page.getByText('Rnd Community', { exact: true }))
    .toBeVisible();
  await expect
    .element(
      page.getByText(`Server address · ${getHostFromServer()}`, {
        exact: true
      })
    )
    .toBeVisible();
  await expect.element(page.getByText(/^Last attempt · /)).toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => actions.connect.mock.calls.length).toBe(1);
  await expect.poll(() => actions.setDisconnectInfo.mock.calls.length).toBe(1);
  expect(actions.setDisconnectInfo).toHaveBeenCalledWith(undefined);
});
