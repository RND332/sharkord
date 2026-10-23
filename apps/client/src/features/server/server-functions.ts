import { tryGetServerBridge, type TServerInfo } from '@dodecagon/shared';
import { createServerFn } from '@tanstack/react-start';

// during development the start server runs in the vite process while the bridge
// lives in the bun process, so the data is read over http from the bun server
const getDevelopmentServerUrl = () => `http://localhost:${VITE_SERVER_PORT}`;

const isDevelopment = () => import.meta.env.MODE === 'development';

const fetchFromBunServer = async <TBody>(path: string): Promise<TBody> => {
  const response = await fetch(`${getDevelopmentServerUrl()}${path}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return (await response.json()) as TBody;
};

// the client asked the server for its data with a plain fetch, the server
// function carries the same call over the start server and answers with the
// data of the request instead of a hand written response
export const readServerInfo = async (): Promise<TServerInfo> => {
  const bridge = tryGetServerBridge();

  if (bridge) {
    return bridge.getServerInfo();
  }

  if (!isDevelopment()) {
    throw new Error('the server bridge is not installed');
  }

  return fetchFromBunServer<TServerInfo>('/info');
};

export const readPluginComponentIds = async (): Promise<string[]> => {
  const bridge = tryGetServerBridge();

  if (bridge) {
    return bridge.listPluginComponentIds();
  }

  if (!isDevelopment()) {
    throw new Error('the server bridge is not installed');
  }

  return fetchFromBunServer<string[]>('/plugin-components');
};

export const getServerInfo = createServerFn({ method: 'GET' }).handler(
  readServerInfo
);

export const getPluginComponentIds = createServerFn({ method: 'GET' }).handler(
  readPluginComponentIds
);

// the language, the state of the connection and the time of the request belong
// to the request, so they are read on the server and handed to the browser
export const getRequestContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    // the module of the request is only loaded on the server, the import stays
    // out of the bundle of the browser
    const { readRequestContext } = await import('./request-context');

    return readRequestContext();
  }
);
