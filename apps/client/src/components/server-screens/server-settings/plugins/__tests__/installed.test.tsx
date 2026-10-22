import { describe, expect, test } from 'bun:test';

const renderInstalled = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './installed.render.tsx', ...(mode ? [mode] : [])],
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

describe('InstalledPlugins', () => {
  test('should render a compact row per plugin', () => {
    const html = renderInstalled();

    expect(html).toContain('Polls');
    expect(html).toContain('Create quick votes in text channels');
    expect(html).toContain('Enabled');
    expect(html).toContain('py-[14px]');
    expect(html).toContain('text-[13px]');
  });

  test('should separate the rows with a divider instead of gaps', () => {
    const html = renderInstalled();

    expect(html).toContain('divide-y divide-line');
    expect(html).not.toContain('space-y-3');
  });

  test('should keep the enable switch and the remove action', () => {
    const html = renderInstalled('single');

    expect(html).toContain('aria-label="Polls"');
    expect(html).toContain('role="switch"');
    // the remove action is the only tooltip trigger in the row
    expect(html.match(/data-slot="tooltip-trigger"/g)).toHaveLength(1);
  });

  test('should mark a plugin that failed to load', () => {
    const html = renderInstalled('error');

    expect(html).toContain('Error');
    expect(html).toContain('boom');
  });

  test('should show the disabled state of a plugin', () => {
    const html = renderInstalled('off');

    expect(html).toContain('Disabled');
  });

  test('should render the empty state without plugins', () => {
    const html = renderInstalled('empty');

    expect(html).toContain('No plugins installed');
  });

  test('should render the disabled state when plugins are turned off', () => {
    const html = renderInstalled('disabled');

    expect(html).toContain('Plugins are disabled');
    expect(html).not.toContain('Create quick votes in text channels');
  });
});
