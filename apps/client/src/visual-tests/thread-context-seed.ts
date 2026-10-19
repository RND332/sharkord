import { Database } from 'bun:sqlite';
import path from 'node:path';

const database = new Database(path.resolve('e2e-data/db.sqlite'));
const timestamp = Date.UTC(2026, 9, 9, 10, 42);
const seed = database.transaction(() => {
  const insert = database.prepare(
    'INSERT INTO messages (content, user_id, channel_id, parent_message_id, created_at, editable, pinned) VALUES (?, ?, 1, ?, ?, 1, 0)'
  );
  const parent = insert.run('Pagination thread parent', 2, null, timestamp);
  const parentId = Number(parent.lastInsertRowid);

  for (let index = 1; index <= 137; index += 1) {
    insert.run(
      `Pagination reply ${String(index).padStart(3, '0')}. A longer reply keeps the history overflowing at the Paper panel width.`,
      index % 2 === 0 ? 1 : 3,
      parentId,
      timestamp + index * 120_000
    );
  }
});

try {
  seed();
} finally {
  database.close();
}
