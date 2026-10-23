import {
  setServerBridge,
  THttpServiceError,
  type TRequestContext,
  type TServerBridge
} from '@dodecagon/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { Route as HealthzRoute } from '../healthz';
import { Route as InfoRoute } from '../info';
import { Route as LoginRoute } from '../login';
import { Route as ManifestRoute } from '../manifest[.]json';
import { Route as BackchannelLogoutRoute } from '../oidc/backchannel-logout';
import { Route as CallbackRoute } from '../oidc/callback';
import { Route as ExchangeRoute } from '../oidc/exchange';
import { Route as OidcLoginRoute } from '../oidc/login';
import { Route as PluginComponentsRoute } from '../plugin-components';

type TRouteHandlerContext = {
  request: Request;
  params: Record<string, string>;
  context: Record<string, unknown>;
  pathname: string;
  next: () => { isNext: true; context: Record<string, unknown> };
};

type TRouteHandler = (
  ctx: TRouteHandlerContext
) => Response | Promise<Response>;

type TRouteWithHandlers = {
  options?: { server?: { handlers?: Record<string, TRouteHandler> } };
};

const SERVER_INFO = {
  serverId: 'demo',
  name: 'Demo',
  description: '',
  logo: null,
  allowNewUsers: true,
  oidcEnabled: false,
  oidcDisableLocalLogin: false
};

const WEB_APP_MANIFEST = {
  name: 'Demo',
  short_name: 'Demo',
  description: '',
  start_url: '/',
  display: 'standalone',
  background_color: '#15171C',
  theme_color: '#15171C',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
};

const createBridge = (
  overrides: Partial<TServerBridge> = {}
): TServerBridge => ({
  getServerInfo: async () => SERVER_INFO,
  getWebAppManifest: async () => WEB_APP_MANIFEST,
  authenticateUser: async () => ({ token: 'token' }),
  createOidcLogin: async () => ({ location: '/', cookie: '' }),
  consumeOidcCallback: async () => ({ location: '/' }),
  consumeOidcHandoff: async () => ({ token: 'token' }),
  verifyBackchannelLogout: async () => ({ userId: 'user' }),
  listPluginComponentIds: async () => [],
  ...overrides
});

const callHandler = async (
  route: unknown,
  method: 'GET' | 'POST',
  url: string,
  options?: { body?: string; contentType?: string }
): Promise<Response> => {
  const handlers = (route as TRouteWithHandlers).options?.server?.handlers;
  const handler = handlers?.[method];

  if (!handler) {
    throw new Error(`the route has no ${method} handler`);
  }

  const { body, contentType } = options ?? {};

  return handler({
    request: new Request(url, {
      method,
      body,
      headers: contentType ? { 'content-type': contentType } : undefined
    }),
    params: {},
    context: {},
    pathname: new URL(url).pathname,
    next: () => ({ isNext: true, context: {} })
  });
};

const callGet = (route: unknown, url: string) => callHandler(route, 'GET', url);

const callPost = (
  route: unknown,
  url: string,
  body: string,
  contentType?: string
) => callHandler(route, 'POST', url, { body, contentType });

afterEach(() => {
  setServerBridge(null);
});

describe('the start server routes', () => {
  test('answers the health check', async () => {
    const response = await callGet(HealthzRoute, 'http://localhost/healthz');
    const body = (await response.json()) as {
      status: string;
      timestamp: number;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });

  test('answers the server info through the bridge', async () => {
    setServerBridge(createBridge());

    const response = await callGet(InfoRoute, 'http://localhost/info');
    const body = (await response.json()) as typeof SERVER_INFO;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(body.name).toBe('Demo');
    expect(body.serverId).toBe('demo');
    expect(body.oidcEnabled).toBe(false);
  });

  test('answers the manifest with the settings of the bridge', async () => {
    setServerBridge(
      createBridge({
        getWebAppManifest: async () => ({
          ...WEB_APP_MANIFEST,
          name: 'A very long server name',
          short_name: 'A very long ',
          description: 'A server'
        })
      })
    );

    const response = await callGet(
      ManifestRoute,
      'http://localhost/manifest.json'
    );
    const body = (await response.json()) as {
      name: string;
      short_name: string;
      description: string;
      start_url: string;
      icons: Array<{ src: string; sizes: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/manifest+json'
    );
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(body.name).toBe('A very long server name');
    expect(body.short_name).toBe('A very long ');
    expect(body.description).toBe('A server');
    expect(body.start_url).toBe('/');
    expect(body.icons[0]?.src).toBe('/icon-192.png');
  });

  test('answers the plugin component ids', async () => {
    setServerBridge(
      createBridge({ listPluginComponentIds: async () => ['notes', 'polls'] })
    );

    const response = await callGet(
      PluginComponentsRoute,
      'http://localhost/plugin-components'
    );
    const body = (await response.json()) as string[];

    expect(response.status).toBe(200);
    expect(body).toEqual(['notes', 'polls']);
  });

  test('answers a broken server when the bridge is not installed', async () => {
    setServerBridge(null);

    const response = await callGet(InfoRoute, 'http://localhost/info');
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

describe('the start login route', () => {
  test('answers the token of the signed in user', async () => {
    setServerBridge(createBridge());

    const response = await callPost(
      LoginRoute,
      'http://localhost/login',
      JSON.stringify({ identity: 'demo', password: 'secret' })
    );
    const body = (await response.json()) as { success: boolean; token: string };

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(body.success).toBe(true);
    expect(body.token).toBe('token');
  });

  test('answers the login field errors', async () => {
    setServerBridge(
      createBridge({
        authenticateUser: async () => {
          throw new THttpServiceError({
            kind: 'field',
            errors: [
              { field: 'identity', message: 'The identity is already taken' }
            ]
          });
        }
      })
    );

    const response = await callPost(
      LoginRoute,
      'http://localhost/login',
      JSON.stringify({ identity: 'demo', password: 'secret' })
    );
    const body = (await response.json()) as { errors: Record<string, string> };

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.errors.identity).toBe('The identity is already taken');
  });

  test('answers the rate limited login', async () => {
    setServerBridge(
      createBridge({
        authenticateUser: async () => {
          throw new THttpServiceError({
            kind: 'rate-limited',
            message: 'Too many login attempts. Please try again shortly.',
            retryAfter: 60
          });
        }
      })
    );

    const response = await callPost(
      LoginRoute,
      'http://localhost/login',
      JSON.stringify({ identity: 'demo', password: 'secret' })
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(body.error).toBe(
      'Too many login attempts. Please try again shortly.'
    );
  });

  test('hands the request context to the bridge', async () => {
    let context: TRequestContext | undefined;

    setServerBridge(
      createBridge({
        authenticateUser: async (_input, requestContext) => {
          context = requestContext;

          return { token: 'token' };
        }
      })
    );

    const response = await callHandler(
      LoginRoute,
      'POST',
      'https://dodecagon.test/login',
      {
        body: JSON.stringify({ identity: 'demo', password: 'secret' }),
        contentType: 'application/json'
      }
    );

    expect(response.status).toBe(200);
    expect(context?.origin).toBe('https://dodecagon.test');
    expect(context?.secure).toBe(true);
  });
});

describe('the start oidc routes', () => {
  test('redirects the oidc login with the state cookie', async () => {
    let context: TRequestContext | undefined;

    setServerBridge(
      createBridge({
        createOidcLogin: async (requestContext) => {
          context = requestContext;

          return {
            location: 'https://provider.test/authorize?state=abc',
            cookie: 'dodecagon_oidc_state_abc=1; HttpOnly; Path=/; Max-Age=300'
          };
        }
      })
    );

    const response = await callGet(
      OidcLoginRoute,
      'http://localhost/oidc/login'
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://provider.test/authorize?state=abc'
    );
    expect(response.headers.get('set-cookie')).toBe(
      'dodecagon_oidc_state_abc=1; HttpOnly; Path=/; Max-Age=300'
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(context?.origin).toBe('http://localhost');
    expect(context?.secure).toBe(false);
  });

  test('redirects the oidc callback to the handoff', async () => {
    setServerBridge(
      createBridge({
        consumeOidcCallback: async () => ({
          location: 'http://localhost/#oidc=handoff'
        })
      })
    );

    const response = await callGet(
      CallbackRoute,
      'http://localhost/oidc/callback?state=abc&code=xyz'
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost/#oidc=handoff'
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('answers the oidc exchange with the token', async () => {
    setServerBridge(
      createBridge({
        consumeOidcHandoff: async () => ({
          token: 'token',
          cookie: 'dodecagon_oidc_state_abc=; HttpOnly; Path=/; Max-Age=0'
        })
      })
    );

    const response = await callPost(
      ExchangeRoute,
      'http://localhost/oidc/exchange',
      JSON.stringify({ code: 'handoff' })
    );
    const body = (await response.json()) as { success: boolean; token: string };

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toBe(
      'dodecagon_oidc_state_abc=; HttpOnly; Path=/; Max-Age=0'
    );
    expect(body.success).toBe(true);
    expect(body.token).toBe('token');
  });

  test('answers the expired oidc exchange with unauthorized', async () => {
    setServerBridge(
      createBridge({
        consumeOidcHandoff: async () => {
          throw new THttpServiceError({
            kind: 'unauthorized',
            message: 'This sign in link has expired, please try again'
          });
        }
      })
    );

    const response = await callPost(
      ExchangeRoute,
      'http://localhost/oidc/exchange',
      JSON.stringify({ code: 'handoff' })
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('This sign in link has expired, please try again');
  });

  test('answers the backchannel logout with an empty body', async () => {
    setServerBridge(createBridge());

    const response = await callPost(
      BackchannelLogoutRoute,
      'http://localhost/oidc/backchannel-logout',
      'logout_token=token',
      'application/x-www-form-urlencoded'
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
  });

  test('answers the rejected backchannel logout with bad request', async () => {
    setServerBridge(
      createBridge({
        verifyBackchannelLogout: async () => {
          throw new THttpServiceError({
            kind: 'bad-request',
            message: 'invalid_request'
          });
        }
      })
    );

    const response = await callPost(
      BackchannelLogoutRoute,
      'http://localhost/oidc/backchannel-logout',
      'logout_token=token',
      'application/x-www-form-urlencoded'
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid_request');
  });
});
