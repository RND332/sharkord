import { describe, expect, test } from 'bun:test';

const renderMarketplace = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './marketplace-loading.render.tsx'],
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

describe('Marketplace', () => {
  test('should show a spinner while the registry loads', () => {
    const html = renderMarketplace();

    expect(html).toContain('animate-spin');

    // the app does not draw placeholder blocks anymore
    expect(html).not.toContain('animate-pulse');
  });
});
