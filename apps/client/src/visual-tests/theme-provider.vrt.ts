import { ThemeProvider } from '@/components/theme-provider';
import { THEMES } from '@/components/theme-provider/themes';
import { useTheme } from '@/components/theme-provider/use-theme';
import {
  createElement,
  StrictMode,
  useCallback,
  type ChangeEvent
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../index.css';

const Controls = () => {
  const { theme, setTheme } = useTheme();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => setTheme(event.target.value),
    [setTheme]
  );
  return createElement(
    'select',
    { 'aria-label': 'Test theme', value: theme, onChange: handleChange },
    [...THEMES.map((item) => item.id), 'system'].map((id) =>
      createElement('option', { key: id, value: id }, id)
    )
  );
};
let root: Root | undefined;
let host: HTMLDivElement;
const render = async () => {
  host = document.createElement('div');
  host.className = 'bg-background text-foreground';
  document.body.append(host);
  root = createRoot(host);
  root.render(
    createElement(
      StrictMode,
      null,
      createElement(ThemeProvider, null, createElement(Controls))
    )
  );
  await expect
    .element(page.getByRole('combobox', { name: 'Test theme' }))
    .toBeVisible();
};

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});
afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.restoreAllMocks();
  host?.remove();
});

test('stored personal theme survives remount and restores default variables when cleared', async () => {
  localStorage.setItem('vite-ui-theme', 'hatsune-miku');
  await render();
  expect(document.documentElement.dataset.theme).toBe('hatsune-miku');
  expect(getComputedStyle(host).backgroundColor).toBe('rgb(22, 36, 38)');
  root!.unmount();
  host.remove();
  await render();
  expect(document.documentElement.dataset.theme).toBe('hatsune-miku');
  await page
    .getByRole('combobox', { name: 'Test theme' })
    .selectOptions('light');
  expect(document.documentElement.style.getPropertyValue('--canvas')).toBe('');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(getComputedStyle(host).backgroundColor).toBe('oklch(1 0 0)');
});

test('system appearance responds to live media changes but never overrides an explicit palette', async () => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  Object.defineProperty(media, 'matches', { value: false, configurable: true });
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  const add = vi.spyOn(media, 'addEventListener');
  const remove = vi.spyOn(media, 'removeEventListener');
  localStorage.setItem('vite-ui-theme', 'system');
  await render();
  expect(document.documentElement.dataset.theme).toBe('light');
  Object.defineProperty(media, 'matches', { value: true, configurable: true });
  media.dispatchEvent(new MediaQueryListEvent('change', { matches: true }));
  await expect.poll(() => document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('vite-ui-theme')).toBe('system');
  await page
    .getByRole('combobox', { name: 'Test theme' })
    .selectOptions('ryuko');
  Object.defineProperty(media, 'matches', { value: false, configurable: true });
  media.dispatchEvent(new MediaQueryListEvent('change', { matches: false }));
  await expect.poll(() => document.documentElement.dataset.theme).toBe('ryuko');
  root!.unmount();
  root = undefined;
  expect(remove.mock.calls.length).toBe(add.mock.calls.length);
});

test('invalid stored values cannot become CSS classes or break the default theme', async () => {
  localStorage.setItem('vite-ui-theme', 'not a valid theme');
  await render();
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.classList.contains('not')).toBe(false);
});

test('theme selection remains usable when browser storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError');
  });
  await render();
  await page
    .getByRole('combobox', { name: 'Test theme' })
    .selectOptions('ryuko');
  expect(document.documentElement.dataset.theme).toBe('ryuko');
});

test('scrollbars follow the chosen palette rather than the operating system', async () => {
  await render();
  const styles = getComputedStyle(document.documentElement);
  expect(styles.getPropertyValue('--scrollbar-track').trim()).toBe('#2b2d31');
  await page
    .getByRole('combobox', { name: 'Test theme' })
    .selectOptions('light');
  expect(styles.getPropertyValue('--scrollbar-track').trim()).toBe('#f7f7f8');
});

test('every catalog palette is applied to real browser surfaces and portal descendants', async () => {
  await render();
  const portal = document.createElement('div');
  portal.className = 'bg-popover text-popover-foreground';
  document.body.append(portal);
  const select = page.getByRole('combobox', { name: 'Test theme' });
  const rgb = (hex: string) =>
    `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  for (const theme of THEMES) {
    await select.selectOptions(theme.id);
    expect(document.documentElement.dataset.theme).toBe(theme.id);
    expect(document.documentElement.style.colorScheme).toBe(theme.mode);
    const expectedBackground =
      theme.id === 'light' ? 'oklch(1 0 0)' : rgb(theme.bg);
    expect(getComputedStyle(host).backgroundColor, theme.id).toBe(
      expectedBackground
    );
    if (theme.source !== 'sharkord')
      expect(getComputedStyle(portal).backgroundColor, theme.id).toBe(
        rgb(theme.nav)
      );
  }
}, 30_000);
