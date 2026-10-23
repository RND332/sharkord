import { getServerBridge } from '@dodecagon/shared';
import { createFileRoute } from '@tanstack/react-router';
import { toInternalErrorResponse } from './-response';

export const Route = createFileRoute('/manifest.json')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const bridge = getServerBridge();
          // the manifest needs the pixel size of the logo, only the server can
          // read the file, so it builds the whole manifest
          const manifest = await bridge.getWebAppManifest();

          return new Response(JSON.stringify(manifest), {
            status: 200,
            headers: {
              'Content-Type': 'application/manifest+json',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        } catch {
          return toInternalErrorResponse();
        }
      }
    }
  }
});
