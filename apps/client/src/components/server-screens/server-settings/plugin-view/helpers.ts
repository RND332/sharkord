import type { TPluginInfo, TPluginTab } from '@sharkord/shared';

type TSettingsTranslations = typeof import('@/i18n/locales/en/settings.json');

export type TPluginStatus = 'enabled' | 'disabled' | 'error';

export const PLUGIN_STATUS_LABEL_KEYS: Record<
  TPluginStatus,
  keyof TSettingsTranslations
> = {
  enabled: 'enabledBadge',
  disabled: 'disabledBadge',
  error: 'errorBadge'
};

export const PLUGIN_STATUS_CLASSES: Record<TPluginStatus, string> = {
  enabled: 'text-success',
  disabled: 'text-muted-foreground',
  error: 'text-destructive'
};

export const getPluginStatus = (plugin: TPluginInfo): TPluginStatus => {
  if (plugin.loadError) return 'error';

  if (plugin.enabled) return 'enabled';

  return 'disabled';
};

export type TPluginTabEntry = {
  id: string;
  label: string;
};

export type TPluginTabLabels = {
  settings: string;
  commands: string;
  logs: string;
  permissions: string;
};

export type TPluginTabOptions = {
  hasSettings: boolean;
  hasCommands: boolean;
  canManagePermissions: boolean;
  customTabs: TPluginTab[];
  labels: TPluginTabLabels;
};

// the tabs of the Paper plugin detail. the ones the plugin brings itself come after the built in ones
export const getPluginTabs = ({
  hasSettings,
  hasCommands,
  canManagePermissions,
  customTabs,
  labels
}: TPluginTabOptions): TPluginTabEntry[] => {
  const tabs: TPluginTabEntry[] = [];

  if (hasSettings) tabs.push({ id: 'settings', label: labels.settings });
  if (hasCommands) tabs.push({ id: 'commands', label: labels.commands });

  tabs.push({ id: 'logs', label: labels.logs });

  if (canManagePermissions) {
    tabs.push({ id: 'permissions', label: labels.permissions });
  }

  for (const tab of customTabs) {
    tabs.push({ id: tab.id, label: tab.label });
  }

  return tabs;
};

// the detail opens on the richest tab the plugin offers, a plugin that only logs gets the logs
export const getDefaultPluginTab = ({
  hasSettings,
  hasCommands
}: Pick<TPluginTabOptions, 'hasSettings' | 'hasCommands'>): string => {
  if (hasSettings) return 'settings';
  if (hasCommands) return 'commands';

  return 'logs';
};
