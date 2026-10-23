import { createFileRoute } from '@tanstack/react-router';
import { toJsonResponse } from './-response';

export const Route = createFileRoute('/healthz')({
  server: {
    handlers: {
      GET: async () =>
        toJsonResponse({ status: 'ok', timestamp: Date.now() }, 200)
    }
  }
});
