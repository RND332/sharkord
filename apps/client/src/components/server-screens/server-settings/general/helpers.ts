type TSettingsTranslations = typeof import('@/i18n/locales/en/settings.json');

export type TGeneralFeatureKey =
  | 'allowNewUsers'
  | 'onlyAskForPasswordOnFirstJoin'
  | 'directMessagesEnabled'
  | 'enableSearch'
  | 'enablePlugins'
  | 'showWelcomeDialog'
  | 'webRtcSimulcastEnabled';

export type TGeneralFeature = {
  key: TGeneralFeatureKey;
  labelKey: keyof TSettingsTranslations;
  descriptionKey?: keyof TSettingsTranslations;
};

// the Paper overview lists the first six toggles in this order. simulcast is not part of the mock,
// so it stays last and the rows the mock does show keep their place
export const GENERAL_FEATURES: TGeneralFeature[] = [
  { key: 'allowNewUsers', labelKey: 'allowNewUsersLabel' },
  {
    key: 'onlyAskForPasswordOnFirstJoin',
    labelKey: 'onlyAskForPasswordOnFirstJoinLabel'
  },
  { key: 'directMessagesEnabled', labelKey: 'directMessagesEnabledLabel' },
  { key: 'enableSearch', labelKey: 'searchEnabledLabel' },
  { key: 'enablePlugins', labelKey: 'pluginsLabel' },
  { key: 'showWelcomeDialog', labelKey: 'showWelcomeDialogLabel' },
  {
    key: 'webRtcSimulcastEnabled',
    labelKey: 'simulcastLabel',
    descriptionKey: 'simulcastDesc'
  }
];

export const GENERAL_FEATURE_KEYS = GENERAL_FEATURES.map(
  (feature) => feature.key
);
