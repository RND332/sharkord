import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { captureError, initSentry } from '../sentry';

describe('sentry', () => {
  afterEach(async () => {
    await Sentry.close(0);
  });

  it('stays out of the way when no dsn is configured', () => {
    initSentry(undefined);

    expect(Sentry.getClient()).toBeUndefined();
    expect(() => captureError(new Error('boom'))).not.toThrow();
  });

  it('opens a client that reports errors once a dsn is configured', () => {
    initSentry('https://public@errors.example.com/2', 'production', '0.0.41');

    const client = Sentry.getClient();

    expect(client).toBeDefined();
    expect(client?.getOptions().dsn).toBe(
      'https://public@errors.example.com/2'
    );
    expect(client?.getOptions().environment).toBe('production');
    expect(client?.getOptions().release).toBe('0.0.41');
    expect(() => captureError(new Error('boom'))).not.toThrow();
  });

  it('keeps chat content out of reported events', () => {
    initSentry('https://public@errors.example.com/2');

    const beforeSend = Sentry.getClient()?.getOptions().beforeSend;

    expect(typeof beforeSend).toBe('function');

    const scrubbed = (
      beforeSend as unknown as (event: unknown, hint: unknown) => unknown
    )(
      {
        event_id: 'kept',
        request: { url: '/trpc', data: { message: 'chat text' } },
        contexts: { response: { body: 'chat text' } },
        extra: { message: 'chat text' },
        tags: { area: 'voice' }
      },
      {}
    ) as Record<string, unknown>;

    expect(scrubbed.event_id).toBe('kept');
    expect(scrubbed.tags).toEqual({ area: 'voice' });
    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.contexts).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
  });
});
