const OIDC_STATE_COOKIE_PREFIX = 'dodecagon_oidc_state_';

const getCookie = (
  cookieHeader: string | undefined,
  name: string
): string | undefined => {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) continue;

    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return undefined;
};

const hasStateCookie = (
  cookieHeader: string | undefined,
  state: string
): boolean =>
  getCookie(cookieHeader, `${OIDC_STATE_COOKIE_PREFIX}${state}`) === '1';

const buildStateCookie = (
  state: string,
  maxAgeSeconds: number,
  secure: boolean
) => {
  const attributes = [
    `${OIDC_STATE_COOKIE_PREFIX}${state}=${maxAgeSeconds === 0 ? '' : '1'}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (secure) attributes.push('Secure');

  return attributes.join('; ');
};

const clearStateCookie = (state: string, secure: boolean) =>
  buildStateCookie(state, 0, secure);

export {
  OIDC_STATE_COOKIE_PREFIX,
  buildStateCookie,
  clearStateCookie,
  getCookie,
  hasStateCookie
};
