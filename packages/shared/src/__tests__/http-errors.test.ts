import { describe, expect, test } from 'bun:test';
import { isHttpServiceError, THttpServiceError } from '../http-errors';

// the start server bundle ships its own copy of the shared package, so the
// error thrown by the bun core is not an instance of the class of this copy
class ForeignServiceError extends Error {
  readonly error: {
    kind: 'field';
    errors: { field: string; message: string }[];
  };

  constructor(error: {
    kind: 'field';
    errors: { field: string; message: string }[];
  }) {
    super('foreign');

    this.name = 'THttpServiceError';
    this.error = error;

    Object.defineProperty(this, Symbol.for('dodecagon.httpServiceError'), {
      value: true
    });
  }
}

describe('the http service error', () => {
  test('carries the failure of the service', () => {
    const error = new THttpServiceError({
      kind: 'field',
      errors: [{ field: 'identity', message: 'The identity is taken' }]
    });

    expect(error.error.kind).toBe('field');
    expect(error.message).toBe('The identity is taken');
  });

  test('is recognized by the routes', () => {
    expect(
      isHttpServiceError(
        new THttpServiceError({
          kind: 'field',
          errors: [{ field: 'identity', message: 'The identity is taken' }]
        })
      )
    ).toBe(true);
  });

  test('is recognized when it comes from another copy of the package', () => {
    expect(
      isHttpServiceError(
        new ForeignServiceError({
          kind: 'field',
          errors: [{ field: 'identity', message: 'The identity is taken' }]
        })
      )
    ).toBe(true);
  });

  test('does not claim a plain error', () => {
    expect(isHttpServiceError(new Error('broken'))).toBe(false);
    expect(isHttpServiceError(undefined)).toBe(false);
    expect(isHttpServiceError({ error: { kind: 'field', errors: [] } })).toBe(
      false
    );
  });
});
