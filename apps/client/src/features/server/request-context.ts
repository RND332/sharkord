import { createServerFn } from '@tanstack/react-start';

// the language, the state of the connection and the time of the request belong
// to the request, so they are read on the server and handed to the browser
export const getRequestContext = createServerFn({ method: 'GET' }).handler(
  async () => {
    // the reader of the request lives in a module of its own, so the import of
    // the server stays out of the bundle of the browser
    const { readRequestContext } = await import('./read-request-context');

    return readRequestContext();
  }
);
