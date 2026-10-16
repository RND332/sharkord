import * as Sentry from '@sentry/bun';
import { TRPCError } from '@trpc/server';
import { SERVER_VERSION } from '../utils/env';

const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
    release: SERVER_VERSION,
    tracesSampleRate: 0,
    beforeSend: (event) => ({
      ...event,
      request: undefined,
      contexts: undefined,
      extra: undefined
    })
  });
};

const shouldReportError = (error: unknown) => {
  if (!(error instanceof TRPCError)) return true;

  return error.code === 'INTERNAL_SERVER_ERROR';
};

const captureError = (error: unknown, tags?: Record<string, string>) => {
  if (!Sentry.getClient()) return;

  Sentry.captureException(error, tags ? { tags } : undefined);
};

export { captureError, initSentry, shouldReportError };
