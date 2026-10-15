import { describe, expect, test } from 'bun:test';
import { getShortcut } from '../shortcuts';

const keyEvent = (overrides: Partial<KeyboardEvent>) =>
  ({
    code: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    isComposing: false,
    getModifierState: () => false,
    ...overrides
  }) as KeyboardEvent;

describe('Discord shortcut matching', () => {
  const cases = [
    ['KeyM', true, true, false, 'mute'],
    ['KeyD', true, true, false, 'deafen'],
    ['Comma', true, false, false, 'settings'],
    ['KeyK', true, false, false, 'search'],
    ['KeyF', true, true, false, 'search'],
    ['KeyU', true, false, false, 'members'],
    ['ArrowUp', false, false, true, 'previousChannel'],
    ['ArrowDown', false, false, true, 'nextChannel'],
    ['KeyV', true, true, true, 'voiceChannel'],
    ['Slash', true, false, false, 'help']
  ] as const;

  for (const [code, primary, shiftKey, altKey, action] of cases) {
    test(`${action} matches the Discord combination on Windows, Linux and macOS`, () => {
      for (const modifier of ['ctrlKey', 'metaKey']) {
        const shortcut = getShortcut(
          keyEvent({ code, shiftKey, altKey, [modifier]: primary })
        );
        expect(shortcut?.action).toBe(action);
      }
    });
  }

  test('AltGraph never triggers application shortcuts', () => {
    const event = keyEvent({
      code: 'KeyM',
      ctrlKey: true,
      shiftKey: true,
      getModifierState: (key) => key === 'AltGraph'
    });
    expect(getShortcut(event)).toBeUndefined();
  });

  test('plain typing and text-formatting shortcuts remain available', () => {
    for (const code of ['KeyM', 'KeyD', 'KeyK', 'KeyV', 'Slash', 'Comma']) {
      expect(getShortcut(keyEvent({ code }))).toBeUndefined();
    }
    for (const code of ['KeyB', 'KeyI', 'KeyE', 'KeyF']) {
      expect(getShortcut(keyEvent({ code, ctrlKey: true }))).toBeUndefined();
    }
  });
});
