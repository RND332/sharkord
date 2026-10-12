import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('demo visibility lifecycle regressions', () => {
  // Bun module mocks affect subsequent test files; isolate the hook harness.
  const fixture = fileURLToPath(
    new URL('./demo-visibility-lifecycle.fixture.ts', import.meta.url)
  );
  const result = spawnSync(process.execPath, ['test', fixture], {
    encoding: 'utf8'
  });
  expect(result.stderr + result.stdout).toContain('0 fail');
  expect(result.status).toBe(0);
});
