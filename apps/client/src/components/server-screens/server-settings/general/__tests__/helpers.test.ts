import settings from '@/i18n/locales/en/settings.json';
import { describe, expect, test } from 'bun:test';
import {
  GENERAL_FEATURES,
  GENERAL_FEATURE_KEYS,
  type TGeneralFeatureKey
} from '../helpers';

// the order of the Paper server overview, the mock shows these six rows
const OVERVIEW_ROWS: TGeneralFeatureKey[] = [
  'allowNewUsers',
  'onlyAskForPasswordOnFirstJoin',
  'directMessagesEnabled',
  'enableSearch',
  'enablePlugins',
  'showWelcomeDialog'
];

describe('general feature rows', () => {
  test('should keep every feature gate the server overview saves', () => {
    expect(GENERAL_FEATURE_KEYS).toEqual([
      ...OVERVIEW_ROWS,
      'webRtcSimulcastEnabled'
    ]);
  });

  test('should keep the rows of the overview in the place the mock shows them', () => {
    expect(GENERAL_FEATURE_KEYS.slice(0, OVERVIEW_ROWS.length)).toEqual(
      OVERVIEW_ROWS
    );
  });

  // simulcast is not part of the overview mock, it has to stay reachable anyway
  test('should keep simulcast as the last row', () => {
    expect(GENERAL_FEATURE_KEYS).toContain('webRtcSimulcastEnabled');
    expect(GENERAL_FEATURE_KEYS.at(-1)).toBe('webRtcSimulcastEnabled');
  });

  test('should not repeat a row', () => {
    expect(new Set(GENERAL_FEATURE_KEYS).size).toBe(
      GENERAL_FEATURE_KEYS.length
    );
  });

  test('should give every row a label that exists', () => {
    for (const feature of GENERAL_FEATURES) {
      expect(settings[feature.labelKey]).toBeString();
    }
  });

  test('should describe the simulcast row and no other', () => {
    const described = GENERAL_FEATURES.filter(
      (feature) => feature.descriptionKey !== undefined
    );

    expect(described.map((feature) => feature.key)).toEqual([
      'webRtcSimulcastEnabled'
    ]);
    expect(settings[described[0].descriptionKey!]).toBeString();
  });
});
