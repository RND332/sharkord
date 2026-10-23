import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../../config';
import { oidcManager } from './manager';

const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

let jwks: { uri: string; keys: ReturnType<typeof createRemoteJWKSet> } | null =
  null;

const getJwks = (uri: string) => {
  if (jwks?.uri !== uri) {
    jwks = { uri, keys: createRemoteJWKSet(new URL(uri)) };
  }

  return jwks.keys;
};

const isLogoutEvent = (payload: JWTPayload): boolean => {
  const events = payload.events;

  if (!events || typeof events !== 'object') return false;

  return typeof (events as Record<string, unknown>)[LOGOUT_EVENT] === 'object';
};

const readLogoutToken = async (
  logoutToken: string
): Promise<{ sub: string; issuer: string }> => {
  if (!logoutToken) throw new Error('no logout_token in the request body');

  const oidcConfig = await oidcManager.getConfiguration();
  const metadata = oidcConfig.serverMetadata();

  if (!metadata.jwks_uri) {
    throw new Error('the provider advertises no jwks_uri');
  }

  const { payload } = await jwtVerify(logoutToken, getJwks(metadata.jwks_uri), {
    issuer: metadata.issuer,
    audience: config.oidc.clientId,
    requiredClaims: ['iat', 'jti', 'events']
  });

  if (payload.nonce !== undefined) {
    throw new Error('logout token carries a nonce');
  }

  if (!isLogoutEvent(payload)) {
    throw new Error('logout token is not a back-channel logout event');
  }

  if (typeof payload.sub !== 'string') {
    throw new Error('logout token identifies no subject');
  }

  return { sub: payload.sub, issuer: metadata.issuer };
};

export { readLogoutToken };
