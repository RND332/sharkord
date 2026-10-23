import type { THttpError } from '@dodecagon/shared';

// a service returns data, the caller turns it into a response, so a failure is a
// value and not an exception
export type TServiceResult<TBody> =
  { ok: true; body: TBody } | { ok: false; error: THttpError };
