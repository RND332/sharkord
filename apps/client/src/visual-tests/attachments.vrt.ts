import { TestId } from '@dodecagon/shared';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { page } from 'vitest/browser';

let root: Root;

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

const composerEditor = async () => {
  const editor = page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR);

  await expect.element(editor).toBeVisible();

  return editor.element();
};

const pasteFile = async (name: string, sizeInBytes: number) => {
  const editor = await composerEditor();

  editor.focus();

  const bytes = new Uint8Array(sizeInBytes);

  for (let index = 0; index < sizeInBytes; index += 1) {
    bytes[index] = index % 256;
  }

  const file = new File([bytes], name, { type: 'text/plain' });
  const dataTransfer = new DataTransfer();

  dataTransfer.items.add(file);

  editor.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true })
  );
};

test('the composer shows the pasted attachment in a discord like card', async () => {
  await pasteFile('design-notes.txt', 64);

  const preview = page.getByText('design-notes.txt', { exact: true });

  await expect.element(preview).toBeVisible();

  const uploading = page.getByText(/Uploading files/);

  await expect.element(uploading).not.toBeInTheDocument();

  const card = document.querySelector('[data-attachment-preview]');

  expect(card).not.toBeNull();

  const bounds = card!.getBoundingClientRect();

  expect(bounds.width).toBe(280);

  const name = preview.element();
  const nameStyle = getComputedStyle(name);

  expect(nameStyle.fontWeight).toBe('600');
  expect(nameStyle.fontSize).toBe('14px');

  const size = name.parentElement?.querySelector('span:last-child');

  expect(size?.textContent?.trim()).not.toBe('');

  await expect(page.elementLocator(card!)).toMatchScreenshot(
    'composer-attachment-card',
    { timeout: 3_000 }
  );
});

test('the composer keeps the focus when the pasted attachment finishes uploading', async () => {
  const editor = await composerEditor();
  const editableStates: (string | null)[] = [];

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      editableStates.push(record.oldValue);
    }
  });

  observer.observe(editor, {
    attributes: true,
    attributeFilter: ['contenteditable'],
    attributeOldValue: true
  });

  await pasteFile('focus-check.txt', 8 * 1024 * 1024);

  const uploading = page.getByText(/Uploading files/);

  await expect.element(uploading).toBeVisible();

  await expect.element(uploading).not.toBeInTheDocument();

  observer.disconnect();

  // the input stays editable while the attachment uploads, so the focus the
  // paste moves away from it comes back
  expect(editableStates).not.toContain('false');
  expect(document.activeElement?.getAttribute('data-testid')).toBe(
    TestId.MESSAGE_COMPOSE_EDITOR
  );
});
