import { OidcError } from '@dodecagon/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { config } from '../../config';
import { authenticateUserService } from '../services/auth';
import {
  consumeOidcHandoffService,
  createOidcLoginService,
  verifyBackchannelLogoutService
} from '../services/oidc';
import { listPluginComponentIdsService } from '../services/plugins';
import { getServerInfoService } from '../services/server-info';

const context = { origin: 'http://localhost:4991', ip: '127.0.0.1' };

// the oidc services read the config, which is process wide and would leak into
// every file that runs after this one
afterEach(() => {
  config.oidc.enabled = false;
  config.oidc.disableLocalLogin = false;
});

describe('the server info service', () => {
  test('reads the settings and the oidc state', async () => {
    const info = await getServerInfoService();

    expect(info.name).toBe('Test Server');
    expect(info.allowNewUsers).toBe(true);
    expect(info.oidcEnabled).toBe(false);
    expect(info.oidcDisableLocalLogin).toBe(false);
  });
});

describe('the plugin service', () => {
  test('lists no components while plugins are off', async () => {
    expect(await listPluginComponentIdsService()).toEqual([]);
  });
});

describe('the auth service', () => {
  test('signs a seeded user in', async () => {
    const result = await authenticateUserService(
      { identity: 'testowner', password: 'password123' },
      context
    );

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.body.token).toBeString();
  });

  test('trims and lowercases the identity', async () => {
    const result = await authenticateUserService(
      { identity: '  TestOwner  ', password: 'password123' },
      context
    );

    expect(result.ok).toBe(true);
  });

  test('refuses a wrong password with the generic error', async () => {
    const result = await authenticateUserService(
      { identity: 'testowner', password: 'wrongpassword' },
      context
    );

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== 'field') return;

    expect(result.error.errors).toEqual([
      { field: 'identity', message: 'Invalid credentials' }
    ]);
  });

  test('refuses the reserved identity', async () => {
    const result = await authenticateUserService(
      { identity: '__deleted_user__', password: 'password123' },
      context
    );

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== 'field') return;

    expect(result.error.errors[0]).toEqual({
      field: 'identity',
      message: 'This identity is reserved'
    });
  });

  test('refuses a short password on the password field', async () => {
    const result = await authenticateUserService(
      { identity: 'testowner', password: 'ab' },
      context
    );

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== 'field') return;

    expect(result.error.errors[0]?.field).toBe('password');
  });

  test('refuses a password login while the server is oidc only', async () => {
    config.oidc.enabled = true;
    config.oidc.disableLocalLogin = true;

    const result = await authenticateUserService(
      { identity: 'testowner', password: 'password123' },
      context
    );

    config.oidc.disableLocalLogin = false;

    expect(result.ok).toBe(false);

    if (result.ok || result.error.kind !== 'field') return;

    expect(result.error.errors[0]).toEqual({
      field: 'identity',
      message: 'This server only accepts sign in through its identity provider'
    });
  });
});

describe('the oidc services', () => {
  test('redirects the login back to the app while oidc is off', async () => {
    const result = await createOidcLoginService(context);

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    const target = new URL(result.body.location);

    expect(target.searchParams.get('oidc_error')).toBe(OidcError.SERVER_ERROR);
    expect(result.body.cookie).toBe('');
  });

  test('refuses an unknown handoff code', async () => {
    config.oidc.enabled = true;

    const result = await consumeOidcHandoffService('nope', context);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.error.kind).toBe('unauthorized');
  });

  test('refuses a logout token that is not one', async () => {
    config.oidc.enabled = true;

    const result = await verifyBackchannelLogoutService('nope', context);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.error.kind).toBe('bad-request');
  });
});
