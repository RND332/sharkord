import { TopBar } from '@/components/top-bar';
import { serverSliceActions } from '@/features/server/slice';
import { store } from '@/features/store';
import { i18n, i18nReady } from '@/i18n';
import {
  StorageOverflowAction,
  type TFile,
  type TPublicServerSettings
} from '@sharkord/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const images = vi.hoisted(() => ({
  first:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Crect width="24" height="24" fill="red"/%3E%3C/svg%3E',
  second:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Crect width="24" height="24" fill="blue"/%3E%3C/svg%3E'
}));

// image hosting is external to the header; keep settings, selectors and avatars real
vi.mock('@/helpers/get-file-url', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/helpers/get-file-url')>();

  return {
    ...actual,
    getFileUrl: (file: TFile | undefined | null) => {
      if (file?.name === 'first-logo.svg') return images.first;
      if (file?.name === 'second-logo.svg') return images.second;
      return actual.getFileUrl(file);
    }
  };
});

const firstLogo: TFile = {
  id: 10,
  name: 'first-logo.svg',
  originalName: 'server.svg',
  md5: 'first-logo',
  userId: null,
  pluginId: null,
  size: 100,
  mimeType: 'image/svg+xml',
  extension: 'svg',
  createdAt: 0,
  updatedAt: null
};
const secondLogo: TFile = { ...firstLogo, id: 11, name: 'second-logo.svg' };
const settings: TPublicServerSettings = {
  name: 'ULTRABUSTER',
  logo: firstLogo,
  description: '',
  serverId: 'branding-test',
  storageUploadEnabled: true,
  directMessagesEnabled: true,
  storageQuota: 1000,
  storageUploadMaxFileSize: 100,
  storageFileSharingInDirectMessages: true,
  storageMaxAvatarSize: 100,
  storageMaxBannerSize: 100,
  storageMaxFilesPerMessage: 5,
  storageSpaceQuotaByUser: 1000,
  storageOverflowAction: StorageOverflowAction.PREVENT_UPLOADS,
  enablePlugins: false,
  webRtcSimulcastEnabled: false,
  webRtcMaxBitrate: 1000,
  enableSearch: false,
  showWelcomeDialog: false,
  storageSignedUrlsEnabled: false
};

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(async () => {
  await i18nReady;
  await i18n.changeLanguage('en');
  store.dispatch(serverSliceActions.resetState());
  store.dispatch(serverSliceActions.setPublicSettings(settings));
  document.documentElement.classList.add('dark');
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(
    createElement(Provider, {
      store,
      children: createElement(TopBar)
    })
  );
  await expect.element(page.getByRole('banner')).toBeVisible();
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  host.remove();
  document.documentElement.classList.remove('dark');
  store.dispatch(serverSliceActions.resetState());
});

test('shows configured server branding instead of fixed product branding', async () => {
  await expect
    .element(page.getByText('ULTRABUSTER', { exact: true }))
    .toBeVisible();
  await expect
    .poll(() => host.querySelector('img')?.getAttribute('src'))
    .toBe(images.first);
  expect(host.textContent).not.toContain('sharkord');
  expect(host.querySelector('img[src="/logo.webp"]')).toBeNull();
});

test('header language and shell match the compact Paper chrome', async () => {
  const header = page.getByRole('banner').element();
  const language = page.getByRole('combobox').element();
  expect(header.getBoundingClientRect().height).toBe(40);
  expect(getComputedStyle(header).borderBottomWidth).toBe('0px');
  expect(getComputedStyle(language).fontSize).toBe('13px');
  expect(getComputedStyle(language).lineHeight).toBe('18px');
});

test('uses the server initial when no logo is configured', async () => {
  store.dispatch(
    serverSliceActions.setPublicSettings({ ...settings, logo: null })
  );
  await expect.element(page.getByText('U', { exact: true })).toBeVisible();
  expect(host.querySelector('img')).toBeNull();
});

test('updates the mounted header when public server branding changes', async () => {
  store.dispatch(
    serverSliceActions.setPublicSettings({
      ...settings,
      name: 'Rnd Community',
      logo: secondLogo
    })
  );
  await expect
    .element(page.getByText('Rnd Community', { exact: true }))
    .toBeVisible();
  await expect
    .poll(() => host.querySelector('img')?.getAttribute('src'))
    .toBe(images.second);
  expect(host.textContent).not.toContain('ULTRABUSTER');

  store.dispatch(
    serverSliceActions.setPublicSettings({
      ...settings,
      name: 'Rnd Community',
      logo: null
    })
  );
  await expect.element(page.getByText('R', { exact: true })).toBeVisible();
  expect(host.querySelector('img')).toBeNull();
});
