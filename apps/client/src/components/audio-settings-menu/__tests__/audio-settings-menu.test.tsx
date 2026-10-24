import { describe, expect, test } from 'bun:test';

const renderAudioSettingsMenu = (kind: 'microphone' | 'output') => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './audio-settings-menu.render.tsx', kind],
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

  return output.slice(marker + '__MARKUP__'.length);
};

describe('AudioSettingsMenu', () => {
  test('should title the popup like the network stats one', () => {
    const html = renderAudioSettingsMenu('microphone');

    // the network stats popup opens with a bold title on the left
    expect(html).toContain(
      '<h3 class="text-sm font-semibold leading-5 text-foreground">Microphone settings</h3>'
    );

    // and keeps the action of the panel in the title row
    expect(html).toContain('data-slot="icon-button"');
    expect(html).toContain('aria-label="Voice settings"');
  });

  test('should split the popup into sections like the network stats one', () => {
    const html = renderAudioSettingsMenu('microphone');

    // the sections are separated by a thin line, not by a separator element
    expect(html.match(/border-t border-line/g)).toHaveLength(2);
    expect(html).not.toContain('data-slot="separator"');

    // every section heading follows the network stats type scale
    expect(
      html.match(/text-\[13px\] font-semibold leading-5 text-foreground/g)
    ).toHaveLength(2);
    expect(html).toContain('Input device');
    expect(html).toContain('Microphone volume');
  });

  test('should use the panel chrome of the network stats popup', () => {
    const html = renderAudioSettingsMenu('microphone');

    // the popup keeps the width of the voice status block it opens above
    expect(html).toContain('w-[236px]');
    expect(html).toContain('rounded-[10px]');
    expect(html).toContain('border border-line');
    expect(html).toContain('bg-panel');
    expect(html).toContain('p-1.5');
    expect(html).toContain('text-[12px]');
    expect(html).not.toContain('shadow-lg');
  });

  test('should show the output labels in the output popup', () => {
    const html = renderAudioSettingsMenu('output');

    expect(html).toContain(
      '<h3 class="text-sm font-semibold leading-5 text-foreground">Headphone settings</h3>'
    );
    expect(html).toContain('Output device');
    expect(html).toContain('Output volume');
  });
});
