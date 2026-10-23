import { config } from '../../config';
import { logger } from '../../logger';
import { type TRateLimitResult } from '../../utils/rate-limiters';
import {
  createRateLimiter,
  getClientRateLimitKey
} from '../../utils/rate-limiters/rate-limiter';

// the limiter lives here rather than in the http layer, so the routes and the
// services share one bucket instead of counting separately
const oidcRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.oidc.maxRequests,
  windowMs: config.rateLimiters.oidc.windowMs
});

const consumeOidcRateLimit = (
  ip: string | undefined,
  route: string
): TRateLimitResult => {
  if (!ip) {
    logger.warn(
      `[Rate Limiter HTTP] Missing IP address in request info, skipping rate limiting for ${route} route.`
    );

    return { allowed: true, remaining: 0, retryAfterMs: 0 };
  }

  return oidcRateLimiter.consume(getClientRateLimitKey(ip));
};

export { consumeOidcRateLimit, oidcRateLimiter };
