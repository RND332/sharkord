import settings from '@/i18n/locales/en/settings.json';
import { describe, expect, test } from 'bun:test';
import {
  EMOJI_COLUMN_LABEL_KEYS,
  EMOJI_COLUMN_ORDER,
  EMOJI_COLUMN_WIDTHS
} from '../helpers';

describe('emoji table columns', () => {
  test('should keep the columns of the table in the order the mock shows them', () => {
    expect(EMOJI_COLUMN_ORDER).toEqual(['icon', 'name', 'size', 'actions']);
  });

  test('should not repeat a column', () => {
    expect(new Set(EMOJI_COLUMN_ORDER).size).toBe(EMOJI_COLUMN_ORDER.length);
  });

  test('should keep the lanes of the mock', () => {
    expect(EMOJI_COLUMN_WIDTHS.icon).toContain('w-[54px]');
    expect(EMOJI_COLUMN_WIDTHS.size).toContain('w-[100px]');
    expect(EMOJI_COLUMN_WIDTHS.actions).toContain('w-[70px]');
  });

  // the name grows and is allowed to shrink, so a long name cannot push the other columns aside
  test('should let the name column grow without moving the other columns', () => {
    expect(EMOJI_COLUMN_WIDTHS.name).toContain('grow');
    expect(EMOJI_COLUMN_WIDTHS.name).toContain('min-w-0');
    expect(EMOJI_COLUMN_WIDTHS.icon).toContain('shrink-0');
    expect(EMOJI_COLUMN_WIDTHS.size).toContain('shrink-0');
    expect(EMOJI_COLUMN_WIDTHS.actions).toContain('shrink-0');
  });

  test('should give every column a header that exists', () => {
    for (const id of EMOJI_COLUMN_ORDER) {
      expect(settings[EMOJI_COLUMN_LABEL_KEYS[id]]).toBeString();
    }
  });
});
