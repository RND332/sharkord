import { spawnSync } from 'node:child_process';
import path from 'node:path';
import setup from './global-setup';

export default async function setupThreadContext() {
  const teardown = await setup();
  const result = spawnSync(
    'bun',
    [path.join(import.meta.dirname, 'thread-context-seed.ts')],
    { cwd: path.resolve(import.meta.dirname, '../..'), stdio: 'inherit' }
  );

  if (result.status !== 0) {
    await teardown();
    throw (
      result.error ?? new Error(`thread fixture exited with ${result.status}`)
    );
  }

  return teardown;
}
