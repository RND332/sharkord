import type { OidcError } from '@dodecagon/shared';

class OidcCallbackError extends Error {
  constructor(
    readonly code: OidcError,
    message: string
  ) {
    super(message);
  }
}

export { OidcCallbackError };
