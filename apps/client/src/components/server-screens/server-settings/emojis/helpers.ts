type TSettingsTranslations = typeof import('@/i18n/locales/en/settings.json');

export type TEmojiColumnId = 'icon' | 'name' | 'size' | 'actions';

// the lanes of the Paper emoji table. the header and the rows share them, so the columns of the
// table stay aligned no matter how long a name is
export const EMOJI_COLUMN_WIDTHS: Record<TEmojiColumnId, string> = {
  icon: 'w-[54px] shrink-0',
  name: 'grow min-w-0',
  size: 'w-[100px] shrink-0',
  actions: 'w-[70px] shrink-0'
};

export const EMOJI_COLUMN_LABEL_KEYS: Record<
  TEmojiColumnId,
  keyof TSettingsTranslations
> = {
  icon: 'emojisIconColumn',
  name: 'emojisNameColumn',
  size: 'emojisSizeColumn',
  actions: 'emojisActionsColumn'
};

export const EMOJI_COLUMN_ORDER: TEmojiColumnId[] = [
  'icon',
  'name',
  'size',
  'actions'
];
