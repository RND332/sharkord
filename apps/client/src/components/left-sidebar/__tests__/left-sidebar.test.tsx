import { describe, expect, test } from 'bun:test';

const renderLeftSidebar = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './left-sidebar.render.tsx'],
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

describe('LeftSidebar', () => {
  test('should show the server name without a logo image', () => {
    const html = renderLeftSidebar();

    expect(html).toContain('data-testid="left-sidebar-server-name"');
    expect(html).toContain('ULTRABUSTER');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('mark.svg');
  });
});
