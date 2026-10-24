export interface THttpFieldError {
  field: string;
  message: string;
}

export type THttpError =
  | { kind: 'field'; errors: THttpFieldError[] }
  | { kind: 'bad-request'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'too-large'; message: string }
  | { kind: 'rate-limited'; message: string; retryAfter: number }
  | { kind: 'internal'; message: string };

export type THttpResult<TBody = unknown> =
  { ok: true; status: number; body: TBody } | { ok: false; error: THttpError };

const STATUS_BY_KIND: Record<THttpError['kind'], number> = {
  field: 400,
  'bad-request': 400,
  unauthorized: 401,
  forbidden: 403,
  'not-found': 404,
  'too-large': 413,
  'rate-limited': 429,
  internal: 500
};

const getErrorMessage = (error: THttpError): string => {
  if (error.kind === 'field') {
    return error.errors[0]?.message ?? 'Request failed';
  }

  return error.message;
};

export const toHttpResponse = <TBody>(result: THttpResult<TBody>): Response => {
  if (result.ok) {
    return Response.json(result.body, { status: result.status });
  }

  const error = result.error;

  if (error.kind === 'field') {
    const errors: Record<string, string> = {};

    for (const item of error.errors) {
      errors[item.field] = item.message;
    }

    return Response.json({ errors }, { status: STATUS_BY_KIND.field });
  }

  if (error.kind === 'rate-limited') {
    return Response.json(
      { error: error.message },
      {
        status: STATUS_BY_KIND['rate-limited'],
        headers: { 'Retry-After': String(error.retryAfter) }
      }
    );
  }

  return Response.json(
    { error: error.message },
    { status: STATUS_BY_KIND[error.kind] }
  );
};

// the start server bundle ships its own copy of this package, so the class of an
// error thrown by the bun core is not the class the server routes know. a key from
// the global symbol registry is the same in every copy of the package inside one
// process, so both sides read and write one slot
const HTTP_SERVICE_ERROR_KEY = Symbol.for('dodecagon.httpServiceError');

// the services report failures as data, the bridge turns them into this error so the
// caller can tell a field error from a rate limit from a broken server
export class THttpServiceError extends Error {
  readonly error: THttpError;

  constructor(error: THttpError) {
    super(getErrorMessage(error));

    this.name = 'THttpServiceError';
    this.error = error;

    Object.defineProperty(this, HTTP_SERVICE_ERROR_KEY, { value: true });
  }
}

// a route cannot ask the error for its class, the class of another copy of the
// package is another class. it asks for the brand instead
export const isHttpServiceError = (
  value: unknown
): value is THttpServiceError =>
  value instanceof Error && HTTP_SERVICE_ERROR_KEY in value;
