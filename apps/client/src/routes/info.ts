import { getServerBridge } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toInternalErrorResponse, toJsonResponse } from './-response';

export const Route = createFileRoute('/info')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const bridge = getServerBridge();
          const info = await bridge.getServerInfo();

          return toJsonResponse(info, 200);
        } catch {
          return toInternalErrorResponse();
        }
      }
    }
  }
});
