import http from 'http';
import { getWebAppManifestService } from '../helpers/services/manifest';

const manifestRouteHandler = async (
  _req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const manifest = await getWebAppManifestService();

  res.writeHead(200, {
    'Content-Type': 'application/manifest+json',
    'Cache-Control': 'public, max-age=3600'
  });
  res.end(JSON.stringify(manifest));
};

export { manifestRouteHandler };
