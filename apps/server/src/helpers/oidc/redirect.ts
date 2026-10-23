import { OidcError } from '@dodecagon/shared';

// the browser is sent back to the app with the error in the url, because a sign in
// that fails is a navigation and not an api call
const buildOidcErrorRedirect = (origin: string, error: OidcError): string => {
  const target = new URL(origin);

  target.searchParams.set('oidc_error', error);

  return target.toString();
};

export { buildOidcErrorRedirect };
