import { setSelectedDmChannelId } from '@/features/app/actions';
import { selectedDmChannelIdSelector } from '@/features/app/selectors';
import { setDmsOpen, setPublicServerSettings } from '@/features/server/actions';
import {
  setChannelReadState,
  setSelectedChannelId
} from '@/features/server/channels/actions';
import { selectedChannelIdSelector } from '@/features/server/channels/selectors';
import {
  dmsOpenSelector,
  publicServerSettingsSelector
} from '@/features/server/selectors';
import { store } from '@/features/store';
import { cleanup, getTRPCClient } from '@/lib/trpc';
import { TestId } from '@sharkord/shared';
import type { CDPSession } from '@vitest/browser-playwright';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test
} from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';

let root: Root;
let julesChannelId: number;
let mikaChannelId: number;

const disclosure = () =>
  page.getByRole('button', { name: 'Direct Channels', exact: true });
const dm = (name: string) =>
  page.getByTestId(TestId.DM_ITEM).filter({ hasText: name });

beforeAll(async () => {
  localStorage.clear();
  localStorage.setItem('vite-ui-theme', 'hatsune-miku');
  document.body.replaceChildren();
  for (const id of ['root', 'portal', 'imagePortal']) {
    const element = document.createElement('div');
    element.id = id;
    document.body.append(element);
  }

  const { ClientApp } = await import('../main');
  root = createRoot(document.getElementById('root')!);
  root.render(createElement(ClientApp));
  await document.fonts.ready;
  await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('rnd332');
  await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill('password123');
  await page.getByTestId(TestId.CONNECT_BUTTON).click();
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'general' })
    .click();
  const trpc = getTRPCClient();
  const jules = await trpc.dms.open.mutate({ userId: 3 });
  const mika = await trpc.dms.open.mutate({ userId: 4 });
  julesChannelId = jules.channelId;
  mikaChannelId = mika.channelId;
});

beforeEach(async () => {
  setDmsOpen(false);
  setSelectedDmChannelId(undefined);
  setSelectedChannelId(1);
  for (const channelId of [3, julesChannelId, mikaChannelId]) {
    setChannelReadState(channelId, { count: 0 });
  }
});

afterEach(async () => {
  await page.viewport(1440, 900);
  await userEvent.keyboard('{Escape}');
  const expanded = document.querySelector<HTMLButtonElement>(
    'button[aria-expanded="true"][aria-label="Direct Channels"]'
  );
  if (expanded) await userEvent.click(expanded);
});

afterAll(() => {
  root?.unmount();
  cleanup();
});

test('starts collapsed above server channels with no read conversation rows', async () => {
  await expect.element(disclosure()).toBeVisible();
  await expect.element(disclosure()).toHaveAttribute('aria-expanded', 'false');
  expect(page.getByTestId(TestId.DM_ITEM).elements()).toHaveLength(0);
  const categories = page.getByTestId(TestId.CATEGORY_ITEM).elements();
  const headingBounds = disclosure().element().getBoundingClientRect();
  expect(headingBounds.bottom).toBeLessThan(
    categories[0]!.getBoundingClientRect().top
  );
});

test('collapsed rows follow canonical unread updates and expanded rows match Paper', async () => {
  setChannelReadState(julesChannelId, { delta: 2 });
  await expect.element(dm('jules')).toBeVisible();
  await expect
    .element(dm('jules').getByTestId(TestId.UNREAD_COUNT))
    .toHaveTextContent('2');
  expect(page.getByTestId(TestId.DM_ITEM).elements()).toHaveLength(1);
  await disclosure().click();
  await expect.element(dm('aria')).toBeVisible();
  await expect.element(dm('mika')).toBeVisible();
  expect(page.getByTestId(TestId.DM_ITEM).elements()).toHaveLength(3);
  expect(disclosure().element().getBoundingClientRect().height).toBe(28);
  const row = dm('jules').element();
  expect(row.getBoundingClientRect().height).toBe(44);
  expect(getComputedStyle(row).borderRadius).toBe('6px');
  expect(getComputedStyle(row).columnGap).toBe('12px');
  await disclosure().click();
  setChannelReadState(julesChannelId, { count: 0 });
  await expect.element(dm('jules')).not.toBeInTheDocument();
  await expect.element(disclosure()).toBeVisible();
});

test('reading removes a collapsed row without closing its DM or channel navigation', async () => {
  setChannelReadState(julesChannelId, { count: 2 });
  const jules = dm('jules');
  await expect.element(jules).toBeVisible();
  const button = jules.element();
  button.focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(dm('jules')).not.toBeInTheDocument();
  await expect.element(disclosure()).toHaveFocus();
  await expect
    .element(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR))
    .toBeVisible();
  const dmState = store.getState();
  expect(selectedDmChannelIdSelector(dmState)).toBe(julesChannelId);
  expect(dmsOpenSelector(dmState)).toBe(true);
  const general = page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'general' });
  await expect.element(general).toBeVisible();
  await general.click();
  const channelState = store.getState();
  expect(dmsOpenSelector(channelState)).toBe(false);
  expect(selectedChannelIdSelector(channelState)).toBe(1);
  await disclosure().click();
  await expect.element(dm('jules')).toBeVisible();
  await expect.element(dm('jules')).not.toHaveAttribute('aria-current');
  await dm('jules').click();
  await expect.element(dm('jules')).toHaveAttribute('aria-current', 'page');
});

test('an unread avatar opens its existing profile without reading or selecting the conversation', async () => {
  setChannelReadState(julesChannelId, { count: 2 });
  const conversation = dm('jules');
  await expect.element(conversation).toBeVisible();
  const row = conversation.element();
  const avatar = row.querySelector<HTMLElement>(
    '[data-slot="popover-trigger"]'
  )!;
  await page.elementLocator(avatar).click();
  await expect.element(page.getByRole('dialog')).toBeVisible();
  await expect
    .element(conversation.getByTestId(TestId.UNREAD_COUNT))
    .toHaveTextContent('2');
  const state = store.getState();
  expect(dmsOpenSelector(state)).toBe(false);
  expect(selectedChannelIdSelector(state)).toBe(1);
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  await expect.element(conversation).toBeVisible();
});

test('keyboard disclosure does not navigate and server settings still gate DMs', async () => {
  await disclosure().click();
  await userEvent.keyboard('{Space}');
  await expect.element(disclosure()).toHaveAttribute('aria-expanded', 'false');
  await userEvent.keyboard('{Enter}');
  await expect.element(disclosure()).toHaveAttribute('aria-expanded', 'true');
  const channelState = store.getState();
  expect(dmsOpenSelector(channelState)).toBe(false);
  expect(selectedChannelIdSelector(channelState)).toBe(1);
  await dm('jules').click();
  const dmState = store.getState();
  expect(dmsOpenSelector(dmState)).toBe(true);
  const settings = publicServerSettingsSelector(dmState)!;
  try {
    setPublicServerSettings({ ...settings, directMessagesEnabled: false });
    await expect.element(disclosure()).not.toBeInTheDocument();
    await expect
      .poll(() => {
        const state = store.getState();
        return dmsOpenSelector(state);
      })
      .toBe(false);
    await expect
      .element(
        page.getByTestId(TestId.CHANNEL_ITEM).filter({ hasText: 'general' })
      )
      .toBeVisible();
  } finally {
    setPublicServerSettings(settings);
  }
});

test.each(['empty', 'unread', 'expanded'] as const)(
  'Miku direct channels match the approved %s Paper state',
  async (state) => {
    if (state === 'unread') {
      setChannelReadState(julesChannelId, { count: 2 });
      await expect.element(dm('jules')).toBeVisible();
    }
    if (state === 'expanded') {
      await disclosure().click();
      await expect.element(dm('aria')).toBeVisible();
      await expect.element(dm('jules')).toBeVisible();
      await expect.element(dm('mika')).toBeVisible();
    }
    expect(document.documentElement.dataset.theme).toBe('hatsune-miku');
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    await userEvent.unhover(document.body);
    await document.fonts.ready;
    const heading = disclosure().element();
    const section = heading.closest('[data-direct-channels]')!;
    await expect(page.elementLocator(section)).toMatchScreenshot(
      `direct-channels-${state}-miku`
    );
  }
);

test('start-conversation search opens the existing DM without hiding channels or the rail entry', async () => {
  await page.getByRole('button', { name: 'Start new conversation' }).click();
  await page.getByPlaceholder('Search user').fill('alex');
  await page.getByRole('menuitem', { name: /alex$/ }).click();
  await expect
    .element(page.getByText('Direct Message', { exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR))
    .toBeVisible();
  const state = store.getState();
  expect(dmsOpenSelector(state)).toBe(true);
  expect(selectedDmChannelIdSelector(state)).toBeDefined();
  await expect
    .element(
      page.getByTestId(TestId.CHANNEL_ITEM).filter({ hasText: 'general' })
    )
    .toBeVisible();
  await expect.element(page.getByTestId(TestId.DM_TOGGLE)).toBeVisible();
});

test('mobile keeps its existing DM entry and the shared disclosure in view', async () => {
  await page.viewport(390, 844);
  const session: CDPSession = cdp();
  const frame = window.frameElement;
  const bounds = frame?.getBoundingClientRect();
  const x = (bounds?.left ?? 0) + 24;
  const y = (bounds?.top ?? 0) + 180;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }]
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 160, y }]
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
  await expect
    .poll(() => {
      const heading = disclosure().element();
      const rect = heading.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    })
    .toBe(true);
  const sidebar = page.getByTestId(TestId.LEFT_SIDEBAR);
  await sidebar
    .getByRole('button', { name: 'Direct Messages', exact: true })
    .click();
  const state = store.getState();
  expect(dmsOpenSelector(state)).toBe(true);
  await expect.element(disclosure()).toBeVisible();
  await disclosure().click();
  await expect.element(dm('aria')).toBeVisible();
});

test('voice-channel navigation leaves DM mode through the existing channel action', async () => {
  await disclosure().click();
  await dm('jules').click();
  const dmState = store.getState();
  expect(dmsOpenSelector(dmState)).toBe(true);
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'Lounge' })
    .click();
  const channelState = store.getState();
  expect(dmsOpenSelector(channelState)).toBe(false);
});
