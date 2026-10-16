import * as Sentry from '@sentry/react';

let enabled = false;

const initSentry = (
  dsn: string | undefined,
  environment?: string,
  release?: string
) => {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: environment ?? 'development',
    ...(release ? { release } : {}),
    tracesSampleRate: 0,
    beforeSend: (event) => ({
      ...event,
      request: undefined,
      contexts: undefined,
      extra: undefined
    })
  });

  enabled = true;
};

const captureError = (error: unknown, tags?: Record<string, string>) => {
  if (!enabled) return;

  Sentry.captureException(error, tags ? { tags } : undefined);
};

export { captureError, initSentry };
