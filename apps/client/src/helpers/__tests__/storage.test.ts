import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemBool,
  LocalStorageKey,
  migrateLegacyStorageKeys,
  setLocalStorageItem
} from '@/helpers/storage';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const original = globalThis.localStorage;

const breakStorage = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError');
    }
  });
};

const restoreStorage = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: original,
    writable: true
  });
};

const installStorageStub = () => {
  const items = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return items.size;
      },
      clear: () => items.clear(),
      getItem: (key: string) => items.get(key) ?? null,
      key: (index: number) => [...items.keys()][index] ?? null,
      removeItem: (key: string) => {
        items.delete(key);
      },
      setItem: (key: string, value: string) => {
        items.set(key, String(value));
      }
    },
    writable: true
  });
};

afterEach(() => {
  restoreStorage();
});

describe('storage', () => {
  it('falls back to defaults when storage access throws', () => {
    breakStorage();

    expect(getLocalStorageItem(LocalStorageKey.DEBUG)).toBeNull();
    expect(getLocalStorageItemBool(LocalStorageKey.DEBUG, true)).toBe(true);
    expect(
      getLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, [])
    ).toEqual([]);
    expect(() =>
      setLocalStorageItem(LocalStorageKey.DEBUG, 'true')
    ).not.toThrow();
  });

  it('falls back to the default when the stored json is corrupt', () => {
    setLocalStorageItem(LocalStorageKey.RECENT_EMOJIS, '{not json');

    expect(
      getLocalStorageItemAsJSON(LocalStorageKey.RECENT_EMOJIS, [])
    ).toEqual([]);
  });
});

describe('legacy storage migration', () => {
  beforeEach(() => {
    installStorageStub();
  });

  it('moves a value saved under the old key and drops the old key', () => {
    localStorage.setItem('sharkord-debug', 'true');
    localStorage.setItem('sharkord-identity', 'rnd332');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(LocalStorageKey.DEBUG)).toBe('true');
    expect(localStorage.getItem(LocalStorageKey.IDENTITY)).toBe('rnd332');
    expect(localStorage.getItem('sharkord-debug')).toBeNull();
    expect(localStorage.getItem('sharkord-identity')).toBeNull();
  });

  it('keeps the current value when both keys hold one', () => {
    localStorage.setItem('sharkord-debug', 'true');
    localStorage.setItem(LocalStorageKey.DEBUG, 'false');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(LocalStorageKey.DEBUG)).toBe('false');
    expect(localStorage.getItem('sharkord-debug')).toBeNull();
  });

  it('leaves keys that never carried the old brand alone', () => {
    localStorage.setItem(LocalStorageKey.VITE_UI_THEME, 'ryuko');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(LocalStorageKey.VITE_UI_THEME)).toBe('ryuko');
  });

  it('does nothing when there is nothing to move', () => {
    setLocalStorageItem(LocalStorageKey.DEBUG, 'true');

    migrateLegacyStorageKeys();

    expect(localStorage.getItem(LocalStorageKey.DEBUG)).toBe('true');
  });
});
