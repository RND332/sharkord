import { highlightMessageElement } from '@/features/server/messages/helpers';
import {
  Button,
  IconButton,
  Select,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { Wifi } from 'lucide-react';
import { createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../index.css';

let root: Root | undefined;
let host: HTMLDivElement | undefined;

const render = async (children: ReactNode) => {
  host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:600px';
  document.body.append(host);
  root = createRoot(host);
  root.render(children);
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};

afterEach(() => {
  root?.unmount();
  root = undefined;
  host?.remove();
  host = undefined;
});

test.each([
  ['default', 16, 8, 40],
  ['sm', 12, 6, 32],
  ['lg', 24, 10, 44]
] as const)(
  'text buttons keep consistent padding at size %s with or without an icon',
  async (size, horizontal, vertical, height) => {
    await render(
      createElement(
        'div',
        {},
        createElement(Button, { size }, 'Plain'),
        createElement(Button, { size }, createElement(Wifi), 'With icon')
      )
    );
    for (const name of ['Plain', 'With icon']) {
      const button = page.getByRole('button', { name }).element();
      const style = getComputedStyle(button);
      expect(style.paddingLeft).toBe(`${horizontal}px`);
      expect(style.paddingRight).toBe(`${horizontal}px`);
      expect(style.paddingTop).toBe(`${vertical}px`);
      expect(style.paddingBottom).toBe(`${vertical}px`);
      expect(button.getBoundingClientRect().height).toBe(height);
    }
  }
);

test.each([
  ['default', 36, 8, 20],
  ['xs', 20, 4, 12],
  ['sm', 28, 6, 16],
  ['lg', 40, 8, 24],
  ['xl', 44, 8, 28]
] as const)(
  'icon buttons have a padded square hit target at size %s',
  async (size, dimension, padding, iconSize) => {
    await render(
      createElement(IconButton, {
        icon: Wifi,
        size,
        'aria-label': 'Connection'
      })
    );
    const button = page.getByRole('button', { name: 'Connection' }).element();
    const icon = button.querySelector('svg')!;
    const style = getComputedStyle(button);
    expect(style.padding).toBe(`${padding}px`);
    expect(button.getBoundingClientRect().width).toBe(dimension);
    expect(button.getBoundingClientRect().height).toBe(dimension);
    expect(icon.getBoundingClientRect().width).toBe(iconSize);
    expect(icon.getBoundingClientRect().height).toBe(iconSize);
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    expect(iconRect.left - buttonRect.left).toBe(padding);
    expect(iconRect.top - buttonRect.top).toBe(padding);
  }
);

test.each([
  ['icon', 40, 8],
  ['icon-sm', 28, 6],
  ['icon-xs', 20, 2]
] as const)(
  'shared buttons have icon padding at size %s',
  async (size, dimension, padding) => {
    await render(
      createElement(Button, { size, 'aria-label': 'Icon' }, createElement(Wifi))
    );
    const button = page.getByRole('button', { name: 'Icon' }).element();
    expect(getComputedStyle(button).padding).toBe(`${padding}px`);
    expect(button.getBoundingClientRect().width).toBe(dimension);
    expect(button.getBoundingClientRect().height).toBe(dimension);
    expect(button.querySelector('svg')!.getBoundingClientRect().width).toBe(16);
  }
);

test.each([
  ['default', 8],
  ['sm', 6]
] as const)(
  'select buttons have explicit vertical padding at size %s',
  async (size, padding) => {
    await render(
      createElement(
        Select,
        { value: 'en' },
        createElement(
          SelectTrigger,
          { size, 'aria-label': 'Language' },
          createElement(SelectValue, { placeholder: 'English' })
        )
      )
    );
    const trigger = page.getByRole('combobox', { name: 'Language' }).element();
    expect(getComputedStyle(trigger).paddingLeft).toBe('12px');
    expect(getComputedStyle(trigger).paddingTop).toBe(`${padding}px`);
    expect(getComputedStyle(trigger).paddingBottom).toBe(`${padding}px`);
  }
);

test('button padding can be overridden and keyboard focus remains visible', async () => {
  await render(
    createElement(
      Button,
      { className: 'px-2 py-1', variant: 'outline' },
      'Override'
    )
  );
  const button = page.getByRole('button', { name: 'Override' }).element();
  expect(getComputedStyle(button).paddingLeft).toBe('8px');
  expect(getComputedStyle(button).paddingTop).toBe('4px');
  await userEvent.tab();
  expect(document.activeElement).toBe(button);
  expect(button.matches(':focus-visible')).toBe(true);
  expect(getComputedStyle(button).boxShadow).not.toBe('none');
});

test('message navigation scrolls instantly while keeping a temporary static highlight', async () => {
  await render(
    createElement(
      'div',
      { 'data-testid': 'scroller', style: { height: 100, overflow: 'auto' } },
      createElement('div', { style: { height: 1000 } }),
      createElement(
        'div',
        { 'data-testid': 'target', style: { height: 20 } },
        'Target'
      ),
      createElement('div', { style: { height: 1000 } })
    )
  );
  const scroller = page.getByTestId('scroller').element();
  const target = page.getByTestId('target').element();
  await highlightMessageElement(target, 80);
  const position = scroller.scrollTop;
  expect(position).toBeGreaterThan(0);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  expect(scroller.scrollTop).toBe(position);
  expect(target.classList.contains('bg-secondary')).toBe(true);
  expect(target.getAnimations()).toHaveLength(0);
  await expect
    .poll(() => target.classList.contains('bg-secondary'))
    .toBe(false);
});

test('all UI motion is disabled regardless of OS preference or inline animation', async () => {
  await render(
    createElement('div', {
      'data-testid': 'motion',
      className:
        'animate-spin transition-all scroll-smooth before:animate-pulse',
      style: { animation: 'spin 2s infinite', transition: 'all 2s' }
    })
  );
  const element = page.getByTestId('motion').element();
  for (const pseudo of [null, '::before', '::after']) {
    const style = getComputedStyle(element, pseudo);
    expect(style.animationName).toBe('none');
    expect(style.animationDuration).toBe('0s');
    expect(style.transitionDuration).toBe('0s');
    expect(style.scrollBehavior).toBe('auto');
  }
  expect(element.getAnimations({ subtree: true })).toHaveLength(0);
});
