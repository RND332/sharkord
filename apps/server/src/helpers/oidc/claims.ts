import { getErrorMessage, OidcError } from '@dodecagon/shared';
import * as client from 'openid-client';
import { logger } from '../../logger';
import { OidcCallbackError } from './error';
import type { TOidcClaims } from './user';

const collectClaims = async (
  oidcConfig: client.Configuration,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
): Promise<{ claims: TOidcClaims; userInfoFailed: boolean }> => {
  const idTokenClaims = tokens.claims();

  if (!idTokenClaims?.sub) {
    throw new OidcCallbackError(
      OidcError.SERVER_ERROR,
      'ID token is missing the sub claim'
    );
  }

  const needsUserInfo =
    !idTokenClaims.email ||
    !idTokenClaims.preferred_username ||
    !idTokenClaims.picture;

  if (!needsUserInfo) {
    return { claims: { ...idTokenClaims }, userInfoFailed: false };
  }

  try {
    const userInfo = await client.fetchUserInfo(
      oidcConfig,
      tokens.access_token,
      idTokenClaims.sub
    );

    return { claims: { ...userInfo, ...idTokenClaims }, userInfoFailed: false };
  } catch (error) {
    logger.warn(
      'OIDC userinfo request failed, continuing with ID token claims only: %s',
      getErrorMessage(error)
    );

    return { claims: { ...idTokenClaims }, userInfoFailed: true };
  }
};

export { collectClaims };
