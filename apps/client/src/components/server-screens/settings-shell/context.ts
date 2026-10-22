import { createContext, useContext } from 'react';

export type TSettingsFormHandle = {
  isDirty: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  discard: () => void;
};

// every mounted section owns a form, the shell keeps them all so a section
// never takes the slot of another one
export type TSettingsFormRegistry = Record<string, TSettingsFormHandle>;

export type TSettingsFormSlot = {
  register: (id: string, handle: TSettingsFormHandle) => void;
  unregister: (id: string, handle: TSettingsFormHandle) => void;
};

const noop: TSettingsFormSlot = {
  register: () => {},
  unregister: () => {}
};

const SettingsFormContext = createContext<TSettingsFormSlot>(noop);

const useSettingsFormSlot = () => useContext(SettingsFormContext);

export { SettingsFormContext, useSettingsFormSlot };
