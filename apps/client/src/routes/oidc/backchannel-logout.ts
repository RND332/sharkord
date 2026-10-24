import { getServerBridge, isHttpServiceError } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toRequestContext } from '../-request';
import { toErrorResponse, toInternalErrorResponse } from '../-response';

export const Route = createFileRoute('/oidc/backchannel-logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const bridge = getServerBridge();
          const body = await request.text();
          const token = new URLSearchParams(body).get('logout_token') ?? '';

          await bridge.verifyBackchannelLogout(
            token,
            toRequestContext(request)
          );

          return new Response(null, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' }
          });
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
