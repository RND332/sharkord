import { describe, expect, test } from 'bun:test';

const css = await Bun.file(new URL('./index.css', import.meta.url)).text();

// the ring token drives the focus rings of the whole app, it stays
// transparent so that a focused control does not draw a ring around it
const ringValues = [...css.matchAll(/^\s*--(?:sidebar-)?ring:\s*(.+);$/gm)].map(
  (match) => match[1]!.trim()
);

describe('the app stylesheet', () => {
  test('keeps the keyboard focus ring invisible in every theme', () => {
    expect(ringValues.length).toBe(4);

    for (const value of ringValues) {
      expect(value).toBe('transparent');
    }
  });
});
