import { TestId } from '@dodecagon/shared';
import type { CDPSession } from '@vitest/browser-playwright';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { cdp, page } from 'vitest/browser';

let root: Root;

beforeAll(async () => {
  localStorage.clear();
  localStorage.setItem('vite-ui-theme', 'hatsune-miku');
  localStorage.setItem(
    'dodecagon-recent-emojis',
    JSON.stringify([
      { name: 'thumbsup', shortcodes: ['thumbsup'], emoji: '👍' }
    ])
  );
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
});

afterAll(() => root.unmount());

const selectBetween = async (start: Element, end: Element) => {
  const session: CDPSession = cdp();
  const startBounds = start.getBoundingClientRect();
  const endBounds = end.getBoundingClientRect();
  const from = { x: startBounds.left + 1, y: startBounds.top + 4 };
  const to = { x: endBounds.right - 1, y: endBounds.bottom - 2 };

  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: from.x,
    y: from.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    pointerType: 'mouse'
  });

  const steps = 6;
  for (let step = 1; step <= steps; step += 1) {
    await session.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
      button: 'left',
      buttons: 1,
      pointerType: 'mouse'
    });
  }

  const selected = window.getSelection()?.toString() ?? '';

  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: to.x,
    y: to.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    pointerType: 'mouse'
  });

  return selected;
};

test('the message toolbar stays compact and leads with the reactions', async () => {
  const message = page.getByTestId(TestId.MESSAGE_ITEM).first();

  await expect.element(message).toBeVisible();

  await message.hover();

  const toolbar = message.element().querySelector('[data-message-actions]');

  expect(toolbar).not.toBeNull();

  await expect
    .poll(
      () => toolbar !== null && getComputedStyle(toolbar).display !== 'none'
    )
    .toBe(true);

  const toolbarElement = toolbar!;

  expect(toolbarElement.getBoundingClientRect().height).toBeLessThanOrEqual(40);

  const iconButtons = toolbarElement.querySelectorAll(
    '[data-slot=icon-button]'
  );

  expect(iconButtons.length).toBeGreaterThan(1);

  for (const button of iconButtons) {
    const bounds = button.getBoundingClientRect();

    expect(bounds.width).toBe(28);
    expect(bounds.height).toBe(28);
  }

  const buttons = [...toolbarElement.querySelectorAll('button')];
  const indexOfTitle = (title: string) =>
    buttons.findIndex((button) => button.getAttribute('title') === title);

  const quickReaction = indexOfTitle(':thumbsup:');
  const addReaction = indexOfTitle('Add Reaction');
  const reply = indexOfTitle('Reply');

  expect(quickReaction).toBeGreaterThanOrEqual(0);
  expect(quickReaction).toBeLessThan(addReaction);
  expect(addReaction).toBeLessThan(reply);
});

test('the whole message, author included, can be selected', async () => {
  const message = page.getByTestId(TestId.MESSAGE_ITEM).first();

  await expect.element(message).toBeVisible();

  const group = message.element().closest('[data-message-group]');

  expect(group).not.toBeNull();

  const author = [...group!.querySelectorAll('span')].find(
    (span) => span.textContent?.trim() === 'aria'
  );
  const content = group!.querySelector('.msg-content');

  expect(author).not.toBeUndefined();
  expect(content).not.toBeNull();

  const selected = await selectBetween(author!, content!);

  expect(selected).toContain('aria');
  expect(selected).toContain('Welcome back');
});
