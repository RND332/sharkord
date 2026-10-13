import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('provider/caller microphone lifecycle regressions', () => {
  // Bun module mocks affect subsequent test files. Keep the provider harness
  // isolated so its browser/scheduler/RPC substitutes cannot alter other suites.
  const fixture = fileURLToPath(
    new URL('./microphone-lifecycle.fixture.ts', import.meta.url)
  );
  const result = spawnSync(process.execPath, ['test', fixture], {
    encoding: 'utf8'
  });
  expect(result.stderr + result.stdout).toContain('0 fail');
  expect(result.status).toBe(0);
}, 15_000);
