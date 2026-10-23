// the dispatcher in bun resolves these values before the request reaches the
// start server, because the start server cannot see the socket of the caller
// and must not trust the forwarded headers of the request
export enum StartRequestHeaders {
  CLIENT_IP = 'x-dodecagon-client-ip',
  PUBLIC_ORIGIN = 'x-dodecagon-public-origin',
  SECURE = 'x-dodecagon-secure',
  MAX_BODY_BYTES = 'x-dodecagon-max-body-bytes'
}
