import { setServerBridge } from '@dodecagon/shared';
import { describe, expect, test } from 'bun:test';
import { readPluginComponentIds, readServerInfo } from '../server-functions';

const createBridge = () => ({
  getServerInfo: async () => ({
    serverId: 'demo',
    name: 'Demo',
    description: '',
    logo: null,
    allowNewUsers: true,
    oidcEnabled: false,
    oidcDisableLocalLogin: false
  }),
  getWebAppManifest: async () => ({
    name: 'Demo',
    short_name: 'Demo',
    description: '',
    start_url: '/',
    display: 'standalone',
    background_color: '#15171C',
    theme_color: '#15171C',
    icons: []
  }),
  authenticateUser: async () => ({ token: 'token' }),
  createOidcLogin: async () => ({ location: '/', cookie: '' }),
  consumeOidcCallback: async () => ({ location: '/' }),
  consumeOidcHandoff: async () => ({ token: 'token' }),
  verifyBackchannelLogout: async () => ({ userId: 'user' }),
  listPluginComponentIds: async () => ['demo-plugin']
});

describe('the server functions', () => {
  test('reads the server info through the bridge', async () => {
    setServerBridge(createBridge());

    const info = await readServerInfo();

    expect(info.name).toBe('Demo');
  });

  test('reads the plugin component ids through the bridge', async () => {
    setServerBridge(createBridge());

    const ids = await readPluginComponentIds();

    expect(ids).toEqual(['demo-plugin']);
  });

  test('fails when the bridge is not installed', async () => {
    setServerBridge(null);

    expect(readServerInfo()).rejects.toThrow(
      'the server bridge is not installed'
    );
  });
});
