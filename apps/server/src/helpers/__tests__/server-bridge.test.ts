import { getServerBridge, setServerBridge } from '@dodecagon/shared';
import { describe, expect, test } from 'bun:test';
import { installServerBridge } from '../server-bridge';

describe('the server bridge', () => {
  test('throws when the bridge is not installed', () => {
    setServerBridge(null);

    expect(() => getServerBridge()).toThrow(
      'the server bridge is not installed'
    );
  });

  test('returns the installed implementation', async () => {
    installServerBridge();

    const bridge = getServerBridge();

    expect(typeof bridge.getServerInfo).toBe('function');
  });
});
