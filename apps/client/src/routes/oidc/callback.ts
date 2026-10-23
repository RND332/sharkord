import { getServerBridge } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toRequestContext } from '../-request';
import { toInternalErrorResponse, toRedirectResponse } from '../-response';

export const Route = createFileRoute('/oidc/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        try {
          const bridge = getServerBridge();
          // the provider gets the whole search of the callback, the token request
          // has to carry every parameter it sent
          const result = await bridge.consumeOidcCallback(
            {
              state: url.searchParams.get('state'),
              code: url.searchParams.get('code'),
              error: url.searchParams.get('error'),
              search: url.search
            },
            toRequestContext(request)
          );

          return toRedirectResponse(result.location, result.cookie);
        } catch {
          return toInternalErrorResponse();
        }
      }
    }
  }
});
