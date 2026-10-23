import {
  StartRequestHeaders,
  THttpServiceError,
  type TRequestContext
} from '@dodecagon/shared';

// the dash in the file name keeps the route generator away: it takes every file
// in the routes folder for a route, and this one is not one

// the bun dispatcher resolves the client ip, the public origin and the body
// limit before the request reaches the start server. the forwarded headers of
// the caller are not read here, they are not trustworthy
const toRequestContext = (request: Request): TRequestContext => {
  const url = new URL(request.url);
  const clientIp = request.headers.get(StartRequestHeaders.CLIENT_IP);
  const publicOrigin = request.headers.get(StartRequestHeaders.PUBLIC_ORIGIN);
  const secure = request.headers.get(StartRequestHeaders.SECURE);
  const cookie = request.headers.get('cookie');

  return {
    origin: publicOrigin ?? url.origin,
    ip: clientIp ? clientIp : undefined,
    secure: secure ? secure === 'true' : url.protocol === 'https:',
    cookie: cookie ?? undefined
  };
};

const getMaxBodyBytes = (request: Request): number => {
  const value = request.headers.get(StartRequestHeaders.MAX_BODY_BYTES);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 256 * 1024;
};

// the bun handlers read an empty body as an empty object and let the service
// reject it, the same shape has to reach the bridge
const readJsonBody = async (request: Request): Promise<unknown> => {
  const body = await request.text();
  const maxBytes = getMaxBodyBytes(request);

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    // the shared taxonomy owns the status, the route answers it the way the bun
    // handler answers a body that is too large
    throw new THttpServiceError({
      kind: 'too-large',
      message: `Request body exceeds the maximum size of ${maxBytes} bytes`
    });
  }

  return body ? (JSON.parse(body) as unknown) : {};
};

export { readJsonBody, toRequestContext };
