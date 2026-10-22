import { describe, expect, test } from 'bun:test';

const renderPluginUsage = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './plugin-usage.render.tsx', ...(mode ? [mode] : [])],
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

describe('PluginStorageUsage', () => {
  test('should render nothing without plugin files', () => {
    expect(renderPluginUsage('empty')).toBe('');
  });

  test('should render the plugin files as compact rows', () => {
    const html = renderPluginUsage();

    expect(html).toContain('Plugin files');
    expect(html).toContain('polls');
    expect(html).toContain('3 files');
    expect(html).toContain('120 KB');
  });

  test('should mark the files of a removed plugin', () => {
    const html = renderPluginUsage('removed');

    expect(html).toContain('Uninstalled');
  });

  test('should drop the card chrome of the old metric card', () => {
    const html = renderPluginUsage();

    expect(html).not.toContain('rounded-lg');
    expect(html).not.toContain('bg-card');
    expect(html).toContain('text-xs');
  });
});
