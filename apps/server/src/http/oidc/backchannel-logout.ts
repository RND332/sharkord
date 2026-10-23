import { DisconnectCode, getErrorMessage } from '@dodecagon/shared';
import type http from 'http';
import { invalidateUserSessions } from '../../db/mutations/users';
import { getUserByOidcSub } from '../../db/queries/users';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { readLogoutToken } from '../../helpers/oidc/logout-token';
import { logger } from '../../logger';
import { disconnectUser } from '../../utils/wss';
import { getTextBody, sendJsonError } from '../helpers';
import { guardOidcRoute } from './common';

const oidcBackchannelLogoutRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info }: { info: ReturnType<typeof getWsInfo> }
) => {
  const guarded = guardOidcRoute(req, res, {
    ip: info?.ip,
    route: '/oidc/backchannel-logout',
    isNavigation: false
  });

  if (!guarded) return;

  let token: { sub: string; issuer: string };

  try {
    const body = await getTextBody(req);
    const logoutToken = new URLSearchParams(body).get('logout_token') ?? '';

    token = await readLogoutToken(logoutToken);
  } catch (error) {
    logger.warn(
      'OIDC back-channel logout rejected: %s',
      getErrorMessage(error)
    );

    sendJsonError(res, 400, 'invalid_request');

    return;
  }

  const user = await getUserByOidcSub(token.sub);

  if (user && user.oidcIssuer === token.issuer) {
    await invalidateUserSessions(user.id);

    disconnectUser(
      user.id,
      DisconnectCode.KICKED,
      'Signed out by the provider'
    );

    logger.info(
      'OIDC back-channel logout ended the sessions of user %d',
      user.id
    );
  }

  res.writeHead(200, { 'Cache-Control': 'no-store' });
  res.end();
};

export { oidcBackchannelLogoutRouteHandler };
