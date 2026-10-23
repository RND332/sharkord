import { getErrorMessage, OidcError } from '@dodecagon/shared';
import type http from 'http';
import jwt from 'jsonwebtoken';
import * as client from 'openid-client';
import { getServerToken } from '../../db/queries/server';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { collectClaims } from '../../helpers/oidc/claims';
import { clearStateCookie, hasStateCookie } from '../../helpers/oidc/cookies';
import { OidcCallbackError } from '../../helpers/oidc/error';
import { oidcManager } from '../../helpers/oidc/manager';
import { resolveOidcUser } from '../../helpers/oidc/user';
import { logger } from '../../logger';
import { isSecureRequest } from '../helpers';
import { guardOidcRoute, redirectWithError } from './common';

const completeOidcCallback = async (
  req: http.IncomingMessage,
  url: URL,
  ip: string | undefined
): Promise<{ handoffCode: string; origin: string }> => {
  const stateParam = url.searchParams.get('state');

  if (url.searchParams.has('error')) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Provider returned "${url.searchParams.get('error')}"`
    );
  }

  if (!stateParam || !hasStateCookie(req.headers.cookie, stateParam)) {
    throw new OidcCallbackError(
      OidcError.INVALID_STATE,
      'No state cookie for the state this callback carries'
    );
  }

  const transaction = oidcManager.takeTransaction(stateParam);

  if (!transaction) {
    throw new OidcCallbackError(
      OidcError.EXPIRED,
      'No pending login for this state, it expired or was already used'
    );
  }

  const oidcConfig = await oidcManager.getConfiguration();

  const callbackUrl = new URL(transaction.redirectUri);

  callbackUrl.search = url.search;

  const tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: stateParam,
    expectedNonce: transaction.nonce
  });

  const { claims, userInfoFailed } = await collectClaims(oidcConfig, tokens);
  const { user } = await resolveOidcUser(claims, { userInfoFailed, ip });

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
    handoffCode: oidcManager.createHandoff(token, stateParam),
    origin: callbackUrl.origin
  };
};

const oidcCallbackRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info, url }: { info: ReturnType<typeof getWsInfo>; url: URL }
) => {
  const guarded = guardOidcRoute(req, res, {
    ip: info?.ip,
    route: '/oidc/callback',
    isNavigation: true
  });

  if (!guarded) return;

  const state = url.searchParams.get('state');

  try {
    const { handoffCode, origin } = await completeOidcCallback(
      req,
      url,
      info?.ip
    );
    const target = new URL(origin);

    target.hash = `oidc=${handoffCode}`;

    res.writeHead(302, {
      'Cache-Control': 'no-store',
      Location: target.toString()
    });
    res.end();
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

    redirectWithError(
      req,
      res,
      code,
      state
        ? { 'Set-Cookie': clearStateCookie(state, isSecureRequest(req)) }
        : {}
    );
  }
};

export { oidcCallbackRouteHandler };
