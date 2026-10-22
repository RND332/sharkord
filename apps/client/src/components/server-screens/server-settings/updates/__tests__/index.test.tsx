import { describe, expect, test } from 'bun:test';

const renderUpdates = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './index.render.tsx', ...(mode ? [mode] : [])],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();
  const marker = output.indexOf('__MARKUP__');

  if (marker === -1) {
    throw new Error(`no markup in the render output:\n${output}`);
  }

  return output.slice(marker + '__MARKUP__'.length).trim();
};

describe('Updates', () => {
  test('should show the loading card while the version is checked', () => {
    const html = renderUpdates('loading');

    expect(html).toContain('Loading...');
    expect(html).not.toContain('Current Version');
  });

  test('should show the up to date state as a compact status row', () => {
    const html = renderUpdates();

    expect(html).toContain('Up to Date');
    expect(html).toContain('Your server is running the latest version');
    expect(html).toContain('Current Version');
    expect(html).toContain('0.0.26');
    expect(html).toContain('Latest Version');
  });

  test('should keep the update action when a newer version exists', () => {
    const html = renderUpdates('available');

    expect(html).toContain('Update Available');
    expect(html).toContain('0.0.27');
    expect(html).toContain('Update Server');
  });

  test('should hide the update action when the server is up to date', () => {
    const html = renderUpdates();

    expect(html).not.toContain('Update Server');
  });

  test('should show the unsupported state when updates are not possible', () => {
    const html = renderUpdates('unsupported');

    expect(html).toContain('Updates Not Supported');
    expect(html).not.toContain('Up to Date');
  });

  test('should not claim the server is up to date when the check failed', () => {
    const html = renderUpdates('failed');

    expect(html).toContain('Could not check for updates');
    expect(html).not.toContain('Up to Date');
    expect(html).toContain('Check again');
    expect(html).toContain('Unknown');
  });

  test('should keep the versions on a separated row under the status', () => {
    const html = renderUpdates();

    expect(html).toContain('border-t border-line');
    expect(html).toContain('size-[42px]');
    expect(html).toContain('gap-[15px]');
  });
});
