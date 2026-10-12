import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('real voice/device providers serialize voice-only mode with session readiness', () => {
  const fixture = fileURLToPath(
    new URL('./voice-only-readiness.fixture.ts', import.meta.url)
  );
  const result = spawnSync(process.execPath, ['test', fixture], {
    encoding: 'utf8'
  });
  expect(result.stderr + result.stdout).toContain('0 fail');
  expect(result.status).toBe(0);
});
