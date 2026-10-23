import { describe, expect, test } from 'bun:test';
import { getServerBridge, setServerBridge } from '../server-bridge';

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
  listPluginComponentIds: async () => []
});

describe('the server bridge registry', () => {
  test('throws when the bridge is not installed', () => {
    setServerBridge(null);

    expect(() => getServerBridge()).toThrow(
      'the server bridge is not installed'
    );
  });

  test('returns the installed implementation', () => {
    const bridge = createBridge();

    setServerBridge(bridge);

    expect(getServerBridge()).toBe(bridge);
  });

  // the start server bundle carries its own copy of this package, so the bridge
  // has to live in the process registry and not in a module level variable
  test('keeps the bridge in the global symbol registry', () => {
    const bridge = createBridge();

    setServerBridge(bridge);

    const slot = globalThis as unknown as {
      [key: symbol]: unknown;
    };

    expect(slot[Symbol.for('dodecagon.serverBridge')]).toBe(bridge);
  });
});
