import { toHttpResponse, type THttpResult } from '@dodecagon/shared';

// the dash in the file name keeps the route generator away: it takes every file
// in the routes folder for a route, and this one is not one

// the bun handlers answer with a plain application/json and never let a response
// be cached, the start routes have to answer with the same headers
const JSON_CONTENT_TYPE = 'application/json';

const toJsonResponse = (
  body: unknown,
  status: number,
  headers: Record<string, string> = {}
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': JSON_CONTENT_TYPE, ...headers }
  });

// the shared taxonomy owns the status codes and the body shapes of the failures,
// the headers are added here because the shared helper cannot set them
const toErrorResponse = (result: THttpResult<never>): Response => {
  const response = toHttpResponse(result);

  response.headers.set('Content-Type', JSON_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'no-store');

  return response;
};

// a bridge that is not installed and a service that broke are the same broken
// server, and the http dispatcher answers them the same way
const toInternalErrorResponse = (): Response =>
  toErrorResponse({
    ok: false,
    error: { kind: 'internal', message: 'Internal server error' }
  });

const toRedirectResponse = (location: string, cookie?: string): Response => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    Location: location
  });

  if (cookie) {
    headers.set('Set-Cookie', cookie);
  }

  return new Response(null, { status: 302, headers });
};

export {
  toErrorResponse,
  toInternalErrorResponse,
  toJsonResponse,
  toRedirectResponse
};
