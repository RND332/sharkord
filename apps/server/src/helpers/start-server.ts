import { getErrorMessage } from '@dodecagon/shared';
import path from 'path';
import { logger } from '../logger';
import { SERVER_BUNDLE_PATH } from './paths';

type TStartHandler = (request: Request) => Promise<Response>;

type TStartEntry = {
  fetch?: (request: Request) => Promise<Response>;
};

let handlerPromise: Promise<TStartHandler | null> | null = null;

// the bundle is imported once and kept, a second import would build a second
// router with its own copy of every server route
const loadStartHandler = async (): Promise<TStartHandler | null> => {
  const entryPath = path.join(SERVER_BUNDLE_PATH, 'server.js');

  try {
    const mod = await import(entryPath);
    const entry = mod.default as TStartEntry | undefined;
    const fetch = entry?.fetch;

    if (typeof fetch !== 'function') {
      logger.warn('The start server bundle has no fetch handler');

      return null;
    }

    return (request: Request) => fetch(request);
  } catch (error) {
    // without the bundle the interface still works as a static site and the api
    // paths stay with the bun handlers, so a missing bundle is not fatal
    logger.warn(
      'Failed to load the start server bundle: %s',
      getErrorMessage(error)
    );

    return null;
  }
};

const getStartHandler = async (): Promise<TStartHandler | null> => {
  if (!handlerPromise) {
    handlerPromise = loadStartHandler();
  }

  return handlerPromise;
};

export { getStartHandler };
export type { TStartHandler };
