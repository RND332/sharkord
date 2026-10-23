import { TestId } from '@dodecagon/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

let root: Root;

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==';

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
});

afterAll(() => root.unmount());

const pasteImage = async (name: string) => {
  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);

  await expect.element(editor).toBeVisible();

  const element = editor.element();

  element.focus();

  const bytes = Uint8Array.from(atob(PNG_BASE64), (character) =>
    character.charCodeAt(0)
  );
  const file = new File([bytes], name, { type: 'image/png' });
  const dataTransfer = new DataTransfer();

  dataTransfer.items.add(file);

  element.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true })
  );

  const progress = page.getByRole('progressbar');

  await expect.element(progress).toBeVisible();
  await expect.element(progress).not.toBeInTheDocument();
};

test('a media attachment is shown once and not repeated by an attachment block', async () => {
  await pasteImage('attachment-test.png');

  const send = page.getByRole('button', { name: 'Send message' });

  await expect.element(send).toBeVisible();

  await send.click();

  const message = page.getByTestId(TestId.MESSAGE_ITEM).last();

  await expect.element(message).toBeVisible();

  await expect
    .poll(() => message.element().querySelectorAll('img').length)
    .toBeGreaterThan(0);

  const element = message.element();

  expect(element.textContent).not.toContain('attachment-test.png');
});

test('a document attachment keeps its attachment block', async () => {
  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);

  await expect.element(editor).toBeVisible();

  const element = editor.element();

  element.focus();

  const file = new File([new Uint8Array([1, 2, 3])], 'report.txt', {
    type: 'text/plain'
  });
  const dataTransfer = new DataTransfer();

  dataTransfer.items.add(file);

  element.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true })
  );

  const progress = page.getByRole('progressbar');

  await expect.element(progress).toBeVisible();
  await expect.element(progress).not.toBeInTheDocument();

  const send = page.getByRole('button', { name: 'Send message' });

  await expect.element(send).toBeVisible();

  await send.click();

  const message = page.getByTestId(TestId.MESSAGE_ITEM).last();

  await expect.element(message).toBeVisible();

  await expect
    .poll(() => message.element().textContent?.includes('report.txt') ?? false)
    .toBe(true);

  await userEvent.keyboard('{Escape}');
});
