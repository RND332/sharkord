import { getServerBridge } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toInternalErrorResponse, toJsonResponse } from './-response';

export const Route = createFileRoute('/plugin-components')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const bridge = getServerBridge();
          const pluginIds = await bridge.listPluginComponentIds();

          return toJsonResponse(pluginIds, 200);
        } catch {
          return toInternalErrorResponse();
        }
      }
    }
  }
});
