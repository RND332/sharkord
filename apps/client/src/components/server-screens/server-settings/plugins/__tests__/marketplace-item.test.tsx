import { describe, expect, test } from 'bun:test';

const renderMarketplaceItem = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './marketplace-item.render.tsx',
      ...(mode ? [mode] : [])
    ],
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

describe('MarketplaceItem', () => {
  test('should render the compact row with the install action', () => {
    const html = renderMarketplaceItem();

    expect(html).toContain('Audio Recorder');
    expect(html).toContain('Save voice sessions when participants consent.');
    expect(html).toContain('Install');
    expect(html).toContain('size-[44px]');
    expect(html).toContain('text-[14px]');
    expect(html).toContain('text-[12px]');
  });

  test('should keep the metadata out of the compact row', () => {
    const html = renderMarketplaceItem();

    expect(html).not.toContain('Dodecagon Community');
    expect(html).not.toContain('v1.0.0');
    expect(html).not.toContain('https://example.com/audio-recorder');
  });

  test('should offer a details toggle that keeps the metadata reachable', () => {
    const html = renderMarketplaceItem();

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Plugin details');
  });

  test('should mark an installed plugin instead of offering an install', () => {
    const html = renderMarketplaceItem('installed');

    expect(html).toContain('Installed');
    expect(html).not.toContain('>Install<');
  });

  test('should offer the update action for a newer compatible version', () => {
    const html = renderMarketplaceItem('update');

    expect(html).toContain('Update');
  });

  test('should disable the install action when the sdk version does not match', () => {
    const html = renderMarketplaceItem('incompatible');

    expect(html).toContain('Incompatible');
    expect(html).toMatch(/<button[^>]*disabled/);
  });
});
