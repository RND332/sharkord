import settings from '@/i18n/locales/en/settings.json';
import type { TPluginInfo, TPluginTab } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  getDefaultPluginTab,
  getPluginStatus,
  getPluginTabs,
  PLUGIN_STATUS_LABEL_KEYS,
  type TPluginTabLabels
} from '../helpers';

const createPlugin = (overrides: Partial<TPluginInfo> = {}): TPluginInfo => ({
  id: 'test-plugin',
  enabled: true,
  sdkVersion: 2,
  author: 'author',
  description: 'a plugin',
  version: '1.0.0',
  logo: undefined,
  name: 'Plugin',
  homepage: undefined,
  path: '/plugins/test-plugin',
  ...overrides
});

const createTab = (id: string, label: string): TPluginTab => ({
  id,
  label,
  component: () => null
});

const LABELS: TPluginTabLabels = {
  settings: 'Settings',
  commands: 'Commands',
  logs: 'Logs',
  permissions: 'Permissions'
};

describe('getPluginStatus', () => {
  test('should report an enabled plugin as enabled', () => {
    expect(getPluginStatus(createPlugin())).toBe('enabled');
  });

  test('should report a disabled plugin as disabled', () => {
    expect(getPluginStatus(createPlugin({ enabled: false }))).toBe('disabled');
  });

  // a plugin that failed to load keeps its state but is broken, that is what the view has to show
  test('should report a plugin that failed to load as an error', () => {
    expect(
      getPluginStatus(createPlugin({ loadError: 'boom', enabled: false }))
    ).toBe('error');
  });

  test('should give every status a label that exists', () => {
    for (const labelKey of Object.values(PLUGIN_STATUS_LABEL_KEYS)) {
      expect(settings[labelKey]).toBeString();
    }
  });
});

describe('getPluginTabs', () => {
  test('should keep every tab of the detail', () => {
    const tabs = getPluginTabs({
      hasSettings: true,
      hasCommands: true,
      canManagePermissions: true,
      customTabs: [],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual([
      'settings',
      'commands',
      'logs',
      'permissions'
    ]);
  });

  test('should drop the settings tab when the plugin has no settings', () => {
    const tabs = getPluginTabs({
      hasSettings: false,
      hasCommands: true,
      canManagePermissions: true,
      customTabs: [],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual([
      'commands',
      'logs',
      'permissions'
    ]);
  });

  test('should drop the commands tab when the plugin has no commands', () => {
    const tabs = getPluginTabs({
      hasSettings: true,
      hasCommands: false,
      canManagePermissions: true,
      customTabs: [],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual([
      'settings',
      'logs',
      'permissions'
    ]);
  });

  test('should drop the permissions tab without the permission to manage them', () => {
    const tabs = getPluginTabs({
      hasSettings: true,
      hasCommands: true,
      canManagePermissions: false,
      customTabs: [],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual(['settings', 'commands', 'logs']);
  });

  test('should keep the logs tab even when the plugin has nothing else', () => {
    const tabs = getPluginTabs({
      hasSettings: false,
      hasCommands: false,
      canManagePermissions: false,
      customTabs: [],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual(['logs']);
  });

  test('should keep the tabs of the plugin itself and put them last', () => {
    const tabs = getPluginTabs({
      hasSettings: true,
      hasCommands: true,
      canManagePermissions: true,
      customTabs: [createTab('custom', 'Custom')],
      labels: LABELS
    });

    expect(tabs.map((tab) => tab.id)).toEqual([
      'settings',
      'commands',
      'logs',
      'permissions',
      'custom'
    ]);
    expect(tabs.at(-1)?.label).toBe('Custom');
  });
});

describe('getDefaultPluginTab', () => {
  test('should open on the settings when the plugin has settings', () => {
    expect(getDefaultPluginTab({ hasSettings: true, hasCommands: true })).toBe(
      'settings'
    );
  });

  test('should open on the commands when the plugin has no settings', () => {
    expect(getDefaultPluginTab({ hasSettings: false, hasCommands: true })).toBe(
      'commands'
    );
  });

  test('should open on the logs when the plugin has nothing else', () => {
    expect(
      getDefaultPluginTab({ hasSettings: false, hasCommands: false })
    ).toBe('logs');
  });
});
