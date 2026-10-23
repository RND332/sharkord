import { describe, expect, test } from 'bun:test';

const renderConnect = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './connect.render.tsx'],
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

describe('Connect', () => {
  test('should show the app name in the header without a logo image', () => {
    const html = renderConnect();
    const header = html.slice(
      html.indexOf('<header'),
      html.indexOf('</header>')
    );

    expect(header).toContain('dodecagon');
    expect(header).not.toContain('<img');
    expect(html).not.toContain('mark.svg');
  });

  test('should still show the logo of the server it connects to', () => {
    const html = renderConnect();

    expect(html).toContain('src="/logo.webp"');
    expect(html).toContain('ULTRABUSTER');
  });
});
