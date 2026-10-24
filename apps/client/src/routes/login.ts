import {
  getServerBridge,
  isHttpServiceError,
  type TLoginInput
} from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { readJsonBody, toRequestContext } from './-request';
import {
  toErrorResponse,
  toInternalErrorResponse,
  toJsonResponse
} from './-response';

export const Route = createFileRoute('/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const bridge = getServerBridge();
          // the service behind the bridge validates the body, the route only
          // forwards what the browser sent
          const input = (await readJsonBody(request)) as TLoginInput;
          const result = await bridge.authenticateUser(
            input,
            toRequestContext(request)
          );

          return toJsonResponse({ success: true, token: result.token }, 200);
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
