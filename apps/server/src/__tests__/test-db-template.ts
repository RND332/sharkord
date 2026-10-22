import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

/**
 * The migrated and seeded database every test starts from, kept as one in-memory image.
 *
 * Migrating and seeding again for every test cost about 22ms each, 37s of the 87s the
 * server suite takes, and none of it depends on the test. Copying the image instead
 * hands the test the same schema, the same rows and the same ids a fresh migrate and
 * seed would have produced.
 */

let template: Buffer | null = null;

const buildTestDbTemplate = (sqlite: Database) => {
  // copied out of the connection right away: sqlite hands the bytes over to the caller,
  // and this copy is the one that stays untouched while the tests run
  template = Buffer.from(sqlite.serialize());
};

const restoreTestDb = () => {
  if (!template) {
    throw new Error('The test db template was not built');
  }

  // a copy per test: sqlite takes ownership of the buffer it is handed and frees it when
  // the connection closes, so the template itself is never given away
  const sqlite = Database.deserialize(Buffer.from(template), { strict: true });

  // the pragma lives on the connection, not in the image, and every cascade in the
  // schema depends on it
  sqlite.run('PRAGMA foreign_keys = ON;');

  const db = drizzle({ client: sqlite });

  return { db, sqlite };
};

export { buildTestDbTemplate, restoreTestDb };
