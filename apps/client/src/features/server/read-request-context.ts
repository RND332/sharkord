import { isSecureRequest } from '@/helpers/is-secure-request';
import { detectLanguageFromHeader } from '@/i18n';
import { getRequest } from '@tanstack/react-start/server';

// the server has no local storage and no navigator, so the language and the
// state of the connection come from the request of the browser
const readRequestContext = async () => {
  const request = getRequest();
  const url = new URL(request.url);

  return {
    language: detectLanguageFromHeader(request.headers.get('accept-language')),
    isSecure: isSecureRequest(request),
    search: url.search,
    now: Date.now()
  };
};

export { readRequestContext };
