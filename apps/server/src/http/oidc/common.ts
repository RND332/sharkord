import { OidcError } from '@dodecagon/shared';
import type http from 'http';
import { consumeOidcRateLimit } from '../../helpers/oidc/rate-limit';
import { buildOidcErrorRedirect } from '../../helpers/oidc/redirect';
import { isOidcEnabled } from '../../helpers/oidc/settings';
import { logger } from '../../logger';
import { getRateLimitRetrySeconds } from '../../utils/rate-limiters/rate-limiter';
import { getPublicOrigin, sendJsonError } from '../helpers';

const redirectWithError = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  error: OidcError,
  extraHeaders: Record<string, string | string[]> = {}
) => {
  res.writeHead(302, {
    'Cache-Control': 'no-store',
    ...extraHeaders,
    Location: buildOidcErrorRedirect(getPublicOrigin(req), error)
  });
  res.end();
};

const guardOidcRoute = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  {
    ip,
    route,
    isNavigation
  }: { ip: string | undefined; route: string; isNavigation: boolean }
): boolean => {
  if (!isOidcEnabled()) {
    if (isNavigation) {
      redirectWithError(req, res, OidcError.SERVER_ERROR);
    } else {
      sendJsonError(res, 404, 'Not found');
    }

    return false;
  }

  const rateLimit = consumeOidcRateLimit(ip, route);

  if (rateLimit.allowed) return true;

  logger.debug(`[Rate Limiter HTTP] ${route} rate limited`);

  if (isNavigation) {
    redirectWithError(req, res, OidcError.RATE_LIMITED);

    return false;
  }

  res.setHeader(
    'Retry-After',
    getRateLimitRetrySeconds(rateLimit.retryAfterMs)
  );
  sendJsonError(
    res,
    429,
    'Too many sign in attempts. Please try again shortly.'
  );

  return false;
};

export { guardOidcRoute, redirectWithError };
