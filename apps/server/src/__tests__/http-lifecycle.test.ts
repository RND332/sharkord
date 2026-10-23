import { describe, expect, test } from 'bun:test';
import { settings } from '../db/schema';
import { login } from './helpers';
import { tdb } from './setup';

/**
 * The test http server runs in this process, so it shares the event loop with the tests.
 * A request the previous test started can still be in flight when the harness swaps the
 * database, so the harness has to wait for the server to go idle before it closes the
 * database. These tests cover that boundary: a request that outlives the test that
 * started it has to be answered against the database it started on.
 */
describe('the test http server', () => {
  let inFlight: Promise<Response> | undefined;

  test('starts a request that outlives the test that started it', async () => {
    // the database of this test is the one the request has to be answered against, and
    // it refuses new users so an unknown identity is turned down
    await tdb.update(settings).set({ allowNewUsers: false });

    // the request is deliberately not awaited: it is still in flight when this test ends
    inFlight = login('nobody-here', 'password123');
  });

  test('answers that request against the database it started on', async () => {
    const response = await inFlight!;

    // the database the request started on does not take new users, so the unknown
    // identity is refused. a request answered against the next test's database would
    // have created the user instead, and one answered against a closed database would
    // have failed with a 500
    expect(response.status).toBe(400);
  });
});
