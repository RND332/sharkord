import { describe, expect, test } from 'bun:test';

const renderMenu = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './voice-card-context-menu.render.tsx',
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

describe('VoiceCardContextMenu', () => {
  test('should keep the pin action out of the demo menu', () => {
    const html = renderMenu();

    expect(html).not.toContain('Unpin stream');
    expect(html).not.toContain('Pin stream');
  });

  test('should place the volume slider under the stop watching action', () => {
    const html = renderMenu();

    const stopWatching = html.indexOf('Stop watching');
    const volume = html.indexOf('Volume');
    const mute = html.indexOf('Mute stream');
    const zoom = html.indexOf('Enable zoom');

    expect(stopWatching).toBeGreaterThan(-1);
    expect(volume).toBeGreaterThan(stopWatching);
    expect(mute).toBeGreaterThan(volume);
    expect(zoom).toBeGreaterThan(mute);
  });

  test('should offer the mute as a checkbox under the volume slider', () => {
    const html = renderMenu();

    expect(html).toContain('role="menuitemcheckbox"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Volume"');
  });

  test('should show the mute checkbox as checked for a muted stream', () => {
    const html = renderMenu('muted');

    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-valuenow="0"');
  });
});
