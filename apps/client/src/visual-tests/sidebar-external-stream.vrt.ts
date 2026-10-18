import { ExternalStream } from '@/components/left-sidebar/external-stream';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../i18n';
import '../index.css';

vi.mock('@/components/voice-provider/hooks/use-stream-volume-control', () => ({
  useStreamVolumeControl: () => ({ isMuted: false })
}));

let root: Root;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

test('external voice streams retain the same indentation as participant rows', async () => {
  const host = document.createElement('div');
  host.style.width = '236px';
  document.body.append(host);
  root = createRoot(host);
  root.render(createElement(ExternalStream, { title: 'Radio' }));
  const title = page.getByText('Radio', { exact: true });
  await expect.element(title).toBeVisible();
  const row = title.element().parentElement!;
  const icon = row.querySelector('svg')!;
  expect(
    icon.getBoundingClientRect().left - row.getBoundingClientRect().left
  ).toBe(38);
  expect(row.getBoundingClientRect().height).toBe(30);
});
