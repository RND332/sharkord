import { getServerBridge, isHttpServiceError } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { readJsonBody, toRequestContext } from '../-request';
import {
  toErrorResponse,
  toInternalErrorResponse,
  toJsonResponse
} from '../-response';

// the body is not validated here, the service behind the bridge does it and
// answers the same field errors the bun handler answered
const getHandoffCode = (body: unknown): string => {
  if (typeof body !== 'object' || body === null) {
    return '';
  }

  const code = (body as { code?: unknown }).code;

  return typeof code === 'string' ? code : '';
};

export const Route = createFileRoute('/oidc/exchange')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const bridge = getServerBridge();
          const code = getHandoffCode(await readJsonBody(request));
          const result = await bridge.consumeOidcHandoff(
            code,
            toRequestContext(request)
          );

          const headers: Record<string, string> = {
            'Cache-Control': 'no-store'
          };

          if (result.cookie) {
            headers['Set-Cookie'] = result.cookie;
          }

          return toJsonResponse(
            { success: true, token: result.token },
            200,
            headers
          );
        } catch (error) {
          if (isHttpServiceError(error)) {
            return toErrorResponse({ ok: false, error: error.error });
          }

          return toInternalErrorResponse();
        }
      }
    }
  }
});
