import { getServerBridge } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toRequestContext } from '../-request';
import { toInternalErrorResponse, toRedirectResponse } from '../-response';

export const Route = createFileRoute('/oidc/login')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const bridge = getServerBridge();
          const result = await bridge.createOidcLogin(
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
