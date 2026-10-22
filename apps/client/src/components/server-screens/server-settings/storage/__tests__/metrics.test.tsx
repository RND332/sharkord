import { describe, expect, test } from 'bun:test';

const renderMetrics = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './metrics.render.tsx', ...(mode ? [mode] : [])],
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

describe('DiskMetrics', () => {
  test('should show usage and capacity on one compact line', () => {
    const html = renderMetrics();

    expect(html).toContain('Disk Usage');
    expect(html).toContain('3.2 GB of 10 GB');
  });

  test('should keep the disk bar with the used share', () => {
    const html = renderMetrics();

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="32"');
    expect(html).toContain('width:32%');
  });

  test('should keep the extra metrics on a single muted line', () => {
    const html = renderMetrics();

    expect(html).toContain('Available Space 1.2 GB');
    expect(html).toContain('Dodecagon Used 800 MB');
    expect(html).toContain('System Used 3.2 GB');
  });

  test('should add the plugin data to the summary line', () => {
    const html = renderMetrics('plugins');

    expect(html).toContain('Plugin data 800 MB');
  });

  test('should leave the plugin data out when there is none', () => {
    const html = renderMetrics();

    expect(html).not.toContain('Plugin data');
  });

  test('should not report zeroed values when the metrics are missing', () => {
    const html = renderMetrics('missing');

    expect(html).toContain('Unavailable');
    expect(html).not.toContain('progressbar');
    expect(html).not.toContain('of 0 B');
  });

  test('should not report zeroed values when the disk has no capacity', () => {
    const html = renderMetrics('no-capacity');

    expect(html).toContain('Unavailable');
    expect(html).not.toContain('progressbar');
  });
});
