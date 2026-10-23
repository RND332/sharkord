import {
  DisconnectCode,
  getErrorMessage,
  OidcError,
  type TOidcCallbackInput,
  type TOidcCallbackResult,
  type TOidcHandoffResult,
  type TOidcLoginResult,
  type TOidcLogoutResult,
  type TRequestContext
} from '@dodecagon/shared';
import jwt from 'jsonwebtoken';
import * as client from 'openid-client';
import z from 'zod';
import { invalidateUserSessions } from '../../db/mutations/users';
import { getServerToken } from '../../db/queries/server';
import { getUserByOidcSub } from '../../db/queries/users';
import { logger } from '../../logger';
import { getRateLimitRetrySeconds } from '../../utils/rate-limiters/rate-limiter';
import { disconnectUser } from '../../utils/wss';
import { collectClaims } from '../oidc/claims';
import {
  buildStateCookie,
  clearStateCookie,
  hasStateCookie
} from '../oidc/cookies';
import { OidcCallbackError } from '../oidc/error';
import { readLogoutToken } from '../oidc/logout-token';
import { oidcManager, TRANSACTION_TTL_SECONDS } from '../oidc/manager';
import { consumeOidcRateLimit } from '../oidc/rate-limit';
import { buildOidcErrorRedirect } from '../oidc/redirect';
import { isOidcEnabled } from '../oidc/settings';
import { resolveOidcUser } from '../oidc/user';
import { toFieldErrors } from './field-errors';
import type { TServiceResult } from './service-result';

const zHandoffCode = z.object({
  code: z.string().min(1).max(256)
});

// the oidc login and the oidc callback are navigations: the browser is sent somewhere
// either way, so a failure is a redirect back to the app with an error code and not
// a status code
const buildErrorRedirect = (context: TRequestContext, error: OidcError) => ({
  location: buildOidcErrorRedirect(context.origin, error),
  cookie: ''
});

const buildCallbackSearch = (input: TOidcCallbackInput): string => {
  const params = new URLSearchParams();

  if (input.code !== null) params.set('code', input.code);
  if (input.state !== null) params.set('state', input.state);
  if (input.error !== null) params.set('error', input.error);

  return params.toString();
};

const completeOidcCallback = async (
  input: TOidcCallbackInput,
  context: TRequestContext
): Promise<{ handoffCode: string; origin: string }> => {
  if (input.error !== null) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Provider returned "${input.error}"`
    );
  }

  if (!input.state || !hasStateCookie(context.cookie, input.state)) {
    throw new OidcCallbackError(
      OidcError.INVALID_STATE,
      'No state cookie for the state this callback carries'
    );
  }

  const transaction = oidcManager.takeTransaction(input.state);

  if (!transaction) {
    throw new OidcCallbackError(
      OidcError.EXPIRED,
      'No pending login for this state, it expired or was already used'
    );
  }

  const oidcConfig = await oidcManager.getConfiguration();

  const callbackUrl = new URL(transaction.redirectUri);

  // the provider gets the whole search of the callback, so the token request carries
  // every parameter the provider sent
  callbackUrl.search = input.search ?? buildCallbackSearch(input);

  const tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: input.state,
    expectedNonce: transaction.nonce
  });

  const { claims, userInfoFailed } = await collectClaims(oidcConfig, tokens);
  const { user } = await resolveOidcUser(claims, {
    userInfoFailed,
    ip: context.ip
  });

  if (user.banned) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Banned user "${user.identity}" attempted to sign in through OIDC`
    );
  }

  // tokenVersion has to travel with the token, otherwise a kick or a password change no
  // longer invalidates the session and anyone already bumped can never sign in again
  const token = jwt.sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    await getServerToken(),
    { expiresIn: '604800s' } // 7 days, matching the password login
  );

  return {
    handoffCode: oidcManager.createHandoff(token, input.state),
    origin: callbackUrl.origin
  };
};

const createOidcLoginService = async (
  context: TRequestContext
): Promise<TServiceResult<TOidcLoginResult>> => {
  if (!isOidcEnabled()) {
    return {
      ok: true,
      body: buildErrorRedirect(context, OidcError.SERVER_ERROR)
    };
  }

  const rateLimit = consumeOidcRateLimit(context.ip, '/oidc/login');

  if (!rateLimit.allowed) {
    return {
      ok: true,
      body: buildErrorRedirect(context, OidcError.RATE_LIMITED)
    };
  }

  try {
    const oidcConfig = await oidcManager.getConfiguration();

    const state = client.randomState();
    const nonce = client.randomNonce();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const redirectUri = oidcManager.resolveRedirectUriFromOrigin(
      context.origin
    );

    oidcManager.startTransaction(state, { nonce, codeVerifier, redirectUri });

    const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce
    });

    return {
      ok: true,
      body: {
        location: authorizationUrl.href,
        cookie: buildStateCookie(
          state,
          TRANSACTION_TTL_SECONDS,
          context.secure ?? false
        )
      }
    };
  } catch (error) {
    logger.error('OIDC login failed to start: %s', getErrorMessage(error));

    return {
      ok: true,
      body: buildErrorRedirect(context, OidcError.SERVER_ERROR)
    };
  }
};

const consumeOidcCallbackService = async (
  input: TOidcCallbackInput,
  context: TRequestContext
): Promise<TServiceResult<TOidcCallbackResult>> => {
  if (!isOidcEnabled()) {
    return {
      ok: true,
      body: {
        location: buildOidcErrorRedirect(context.origin, OidcError.SERVER_ERROR)
      }
    };
  }

  const rateLimit = consumeOidcRateLimit(context.ip, '/oidc/callback');

  if (!rateLimit.allowed) {
    return {
      ok: true,
      body: {
        location: buildOidcErrorRedirect(context.origin, OidcError.RATE_LIMITED)
      }
    };
  }

  try {
    const { handoffCode, origin } = await completeOidcCallback(input, context);
    const target = new URL(origin);

    target.hash = `oidc=${handoffCode}`;

    return { ok: true, body: { location: target.toString() } };
  } catch (error) {
    const code =
      error instanceof OidcCallbackError ? error.code : OidcError.SERVER_ERROR;

    if (error instanceof client.ResponseBodyError) {
      logger.error(
        'OIDC callback failed: provider returned "%s" (%s) with status %d',
        error.error,
        error.error_description ?? 'no description',
        error.status
      );
    } else {
      logger.error('OIDC callback failed: %s', getErrorMessage(error));
    }

    return {
      ok: true,
      body: {
        location: buildOidcErrorRedirect(context.origin, code),
        ...(input.state
          ? { cookie: clearStateCookie(input.state, context.secure ?? false) }
          : {})
      }
    };
  }
};

const consumeOidcHandoffService = async (
  code: string,
  context: TRequestContext
): Promise<TServiceResult<TOidcHandoffResult>> => {
  if (!isOidcEnabled()) {
    return { ok: false, error: { kind: 'not-found', message: 'Not found' } };
  }

  const rateLimit = consumeOidcRateLimit(context.ip, '/oidc/exchange');

  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: {
        kind: 'rate-limited',
        message: 'Too many sign in attempts. Please try again shortly.',
        retryAfter: getRateLimitRetrySeconds(rateLimit.retryAfterMs)
      }
    };
  }

  const parsed = zHandoffCode.safeParse({ code });

  if (!parsed.success) {
    return {
      ok: false,
      error: { kind: 'field', errors: toFieldErrors(parsed.error) }
    };
  }

  const handoff = oidcManager.takeHandoff(parsed.data.code);

  if (!handoff || !hasStateCookie(context.cookie, handoff.state)) {
    return {
      ok: false,
      error: {
        kind: 'unauthorized',
        message: 'This sign in link has expired, please try again'
      }
    };
  }

  return {
    ok: true,
    body: {
      token: handoff.token,
      cookie: clearStateCookie(handoff.state, context.secure ?? false)
    }
  };
};

const verifyBackchannelLogoutService = async (
  token: string,
  context: TRequestContext
): Promise<TServiceResult<TOidcLogoutResult>> => {
  if (!isOidcEnabled()) {
    return { ok: false, error: { kind: 'not-found', message: 'Not found' } };
  }

  const rateLimit = consumeOidcRateLimit(
    context.ip,
    '/oidc/backchannel-logout'
  );

  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: {
        kind: 'rate-limited',
        message: 'Too many sign in attempts. Please try again shortly.',
        retryAfter: getRateLimitRetrySeconds(rateLimit.retryAfterMs)
      }
    };
  }

  let claims: { sub: string; issuer: string };

  try {
    claims = await readLogoutToken(token);
  } catch (error) {
    logger.warn(
      'OIDC back-channel logout rejected: %s',
      getErrorMessage(error)
    );

    return {
      ok: false,
      error: { kind: 'bad-request', message: 'invalid_request' }
    };
  }

  const user = await getUserByOidcSub(claims.sub);

  // an unknown subject is not an error, the provider is only told that the logout
  // went through
  if (!user || user.oidcIssuer !== claims.issuer) {
    return { ok: true, body: { userId: '' } };
  }

  await invalidateUserSessions(user.id);

  disconnectUser(user.id, DisconnectCode.KICKED, 'Signed out by the provider');

  logger.info(
    'OIDC back-channel logout ended the sessions of user %d',
    user.id
  );

  return { ok: true, body: { userId: String(user.id) } };
};

export {
  consumeOidcCallbackService,
  consumeOidcHandoffService,
  createOidcLoginService,
  verifyBackchannelLogoutService
};
