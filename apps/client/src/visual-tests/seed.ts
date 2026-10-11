import { Database } from 'bun:sqlite';
import path from 'node:path';

const databasePath = path.resolve(process.cwd(), 'e2e-data/db.sqlite');
const database = new Database(databasePath, { strict: true });
const timestamp = Date.UTC(2026, 9, 9, 9, 40);

const transaction = database.transaction(() => {
  database.run(
    "UPDATE settings SET name = 'Rnd Community', description = 'A focused space for product, engineering, and design.'"
  );

  const users = [
    [1, 'rnd332', 'rnd332', '#53647A'],
    [2, 'aria', 'aria', '#647D6F'],
    [3, 'jules', 'jules', '#8B747E'],
    [4, 'mika', 'mika', '#6E7185'],
    [5, 'alex', 'alex', '#636A75']
  ] as const;

  for (const [id, identity, name, profileColor] of users) {
    database.run(
      'UPDATE users SET identity = ?, name = ?, profile_color = ? WHERE id = ?',
      [identity, name, profileColor, id]
    );
  }

  database.run('DELETE FROM messages');
  database.run('DELETE FROM direct_messages');
  database.run(
    'DELETE FROM channel_user_permissions WHERE channel_id NOT IN (1, 2, 3, 4)'
  );
  database.run(
    'DELETE FROM channel_role_permissions WHERE channel_id NOT IN (1, 2, 3, 4)'
  );
  database.run('DELETE FROM channels WHERE id NOT IN (1, 2, 3, 4)');
  database.run('DELETE FROM categories WHERE id NOT IN (1, 2)');
  database.run('UPDATE plugin_data SET enabled = 0');
  database.run(
    "UPDATE channels SET name = 'general', topic = 'Daily conversation and team updates', position = 0 WHERE id = 1"
  );
  database.run(
    "UPDATE channels SET name = 'Lounge', topic = 'Drop in and talk', position = 0, private = 0 WHERE id = 2"
  );
  database.run(
    "UPDATE channels SET name = 'Studio', topic = 'Focused collaboration', position = 1, private = 0 WHERE id = 4"
  );
  database.run(
    "UPDATE channels SET name = 'aria', type = 'TEXT', is_dm_channel = 1, category_id = NULL, position = 0, private = 1 WHERE id = 3"
  );
  database.run(
    'INSERT INTO direct_messages (channel_id, user_one_id, user_two_id, created_at) VALUES (3, 1, 2, ?) ',
    [timestamp]
  );

  database.run(
    "INSERT INTO channels (type, name, topic, private, is_dm_channel, position, category_id, created_at) VALUES ('TEXT', 'announcements', 'News and important updates', 0, 0, 1, 1, ?) ",
    [timestamp]
  );
  database.run(
    "INSERT INTO channels (type, name, topic, private, is_dm_channel, position, category_id, created_at) VALUES ('TEXT', 'showcase', 'Share what you are building', 0, 0, 2, 1, ?) ",
    [timestamp]
  );

  const insertMessage = database.prepare(
    'INSERT INTO messages (content, user_id, channel_id, parent_message_id, created_at, editable, pinned) VALUES (?, ?, ?, ?, ?, 1, 0)'
  );
  const parentMessageId = Number(
    insertMessage.run(
      'Welcome back — the launch checklist is ready for a final pass.',
      2,
      1,
      null,
      timestamp
    ).lastInsertRowid
  );
  insertMessage.run(
    'Great. I tightened the mobile spacing and updated the empty state.',
    1,
    1,
    null,
    timestamp + 120_000
  );
  insertMessage.run(
    'The new direction feels much calmer. I left one note on the voice controls.',
    3,
    1,
    null,
    timestamp + 240_000
  );
  insertMessage.run(
    'Thread reply: the voice controls are grouped by purpose now.',
    1,
    1,
    parentMessageId,
    timestamp + 300_000
  );
  insertMessage.run(
    'Perfect — that resolves my note.',
    2,
    1,
    parentMessageId,
    timestamp + 360_000
  );
  insertMessage.run(
    'I sent the final assets for the profile treatment.',
    2,
    3,
    null,
    timestamp + 480_000
  );
});

try {
  transaction();
} finally {
  database.close();
}
