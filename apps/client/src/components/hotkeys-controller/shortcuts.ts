type TShortcut = {
  action:
    | 'mute'
    | 'deafen'
    | 'settings'
    | 'search'
    | 'members'
    | 'previousChannel'
    | 'nextChannel'
    | 'help'
    | 'voiceChannel';
  code: string;
  modifiers: readonly ('Mod' | 'Shift' | 'Alt')[];
  label: string;
};

export const SHORTCUTS: readonly TShortcut[] = [
  {
    action: 'mute',
    code: 'KeyM',
    modifiers: ['Mod', 'Shift'],
    label: 'dialogs:shortcutMute'
  },
  {
    action: 'deafen',
    code: 'KeyD',
    modifiers: ['Mod', 'Shift'],
    label: 'dialogs:shortcutDeafen'
  },
  {
    action: 'settings',
    code: 'Comma',
    modifiers: ['Mod'],
    label: 'sidebar:userSettings'
  },
  {
    action: 'search',
    code: 'KeyK',
    modifiers: ['Mod'],
    label: 'topbar:searchContent'
  },
  {
    action: 'search',
    code: 'KeyF',
    modifiers: ['Mod', 'Shift'],
    label: 'topbar:searchContent'
  },
  {
    action: 'members',
    code: 'KeyU',
    modifiers: ['Mod'],
    label: 'dialogs:shortcutMembers'
  },
  {
    action: 'previousChannel',
    code: 'ArrowUp',
    modifiers: ['Alt'],
    label: 'dialogs:shortcutPreviousChannel'
  },
  {
    action: 'nextChannel',
    code: 'ArrowDown',
    modifiers: ['Alt'],
    label: 'dialogs:shortcutNextChannel'
  },
  {
    action: 'voiceChannel',
    code: 'KeyV',
    modifiers: ['Mod', 'Shift', 'Alt'],
    label: 'dialogs:shortcutBackToVoice'
  },
  {
    action: 'help',
    code: 'Slash',
    modifiers: ['Mod'],
    label: 'dialogs:keyboardShortcutsTitle'
  }
];

export const getShortcut = (event: KeyboardEvent) => {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    (event.ctrlKey && event.metaKey) ||
    event.getModifierState('AltGraph')
  )
    return;

  return SHORTCUTS.find(
    ({ code, modifiers }) =>
      event.code === code &&
      (event.ctrlKey || event.metaKey) === modifiers.includes('Mod') &&
      event.shiftKey === modifiers.includes('Shift') &&
      event.altKey === modifiers.includes('Alt')
  );
};
