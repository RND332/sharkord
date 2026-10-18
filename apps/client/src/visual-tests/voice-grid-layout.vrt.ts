import { VoiceGrid } from '@/components/channel-view/voice/voice-grid';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';
import '../index.css';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

let root: Root | undefined;
let host: HTMLDivElement | undefined;
const cards = ['share', 'one', 'two', 'three'].map((id) =>
  createElement(
    'div',
    {
      key: id,
      'data-card': id,
      style: {
        width: '100%',
        height: '100%',
        minHeight: 100,
        background: 'gray'
      }
    },
    id
  )
);

const render = async (pinnedCardId?: string) => {
  if (!host) {
    host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:0;top:0;width:1292px;height:720px';
    document.body.append(host);
    root = createRoot(host);
  }
  root!.render(
    createElement(VoiceGrid, {
      pinnedCardId,
      tileAspectRatio: 16 / 9,
      children: cards
    })
  );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};

const columns = () => {
  const grid = host!.firstElementChild!;
  return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
  host?.remove();
  host = undefined;
});

test('grid continues measuring after pinning, resizing and unpinning', async () => {
  await render();
  await expect.poll(columns).toBe(2);
  await render('share');
  host!.style.width = '380px';
  await render();
  await expect.poll(columns).toBe(1);
  host!.style.width = '1292px';
  await expect.poll(columns).toBe(2);
});

test('pinned participants use the Paper 4:3 thumbnail size', async () => {
  await render('share');
  const thumbnail = host!.querySelector('[data-card="one"]')!;
  const rect = thumbnail.getBoundingClientRect();
  expect(rect.width).toBe(152);
  expect(rect.height).toBe(114);
  expect(getComputedStyle(host!.firstElementChild!).paddingTop).toBe('36px');
  expect(getComputedStyle(host!.firstElementChild!).paddingBottom).toBe('36px');
});

test('removing an initially pinned card restores measurement for the remaining users', async () => {
  await render('share');
  root!.render(
    createElement(VoiceGrid, {
      pinnedCardId: 'share',
      tileAspectRatio: 16 / 9,
      children: cards.slice(1)
    })
  );
  await expect.poll(columns).toBe(2);
  expect(host!.querySelectorAll('[data-card]')).toHaveLength(3);
});

test('unpinning a stream after mount restores a two-column participant grid', async () => {
  await render('share');
  await render();
  await expect.poll(columns).toBe(2);
  const tiles = Array.from(host!.querySelectorAll('[data-card]'));
  const rects = tiles.map((tile) => tile.getBoundingClientRect());
  expect(rects[0].top).toBe(rects[1].top);
  expect(rects[0].left).toBeLessThan(rects[1].left);
  expect(rects[0].width / rects[0].height).toBeCloseTo(16 / 9);
  expect(rects[0].width).toBe(rects[3].width);
  expect(rects[3].bottom).toBeLessThanOrEqual(
    host!.getBoundingClientRect().bottom
  );
});
