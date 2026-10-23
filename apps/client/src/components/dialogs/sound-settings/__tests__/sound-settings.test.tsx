import { describe, expect, test } from 'bun:test';

const renderSoundSettings = (enabled = 'joinLeave,muteDeafen') => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './sound-settings.render.tsx', enabled],
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

describe('SoundSettingsDialog', () => {
  test('should render the approved sound settings layout', () => {
    const html = renderSoundSettings();

    expect(html).toContain('Sound settings');
    expect(html).toContain('Choose what you hear in calls.');
    expect(html).toContain('Join and leave sounds');
    expect(html).toContain('Mute and deafen sounds');
    expect(html).toContain(
      'These preferences only affect sounds played on this device.'
    );
    expect(html).toContain('Save sound settings');

    // compact surface: the shell is sectioned instead of padded as one box
    expect(html).toContain('gap-0');
    expect(html).toContain('p-0');
    expect(html).toContain('px-6');
    expect(html).toContain('pt-6');
    expect(html).toContain('pb-5');

    // title and description follow the approved type scale
    expect(html).toContain('text-[20px]');
    expect(html).toContain('text-[13px]');

    // the toggle labels follow the approved type scale
    expect(html).toContain('text-[15px]');

    // the action sits on the nav surface
    expect(html).toContain('bg-nav');
  });

  test('should keep one switch per call sound group', () => {
    const html = renderSoundSettings();

    expect(html.match(/role="switch"/g)?.length).toBe(2);
    expect(html).toContain('aria-label="Join and leave sounds"');
    expect(html).toContain('aria-label="Mute and deafen sounds"');
  });

  test('should show the stored choices on the switches', () => {
    const html = renderSoundSettings('joinLeave');

    const switches = html.match(/<span[^>]*role="switch"[^>]*>/g) ?? [];

    expect(switches).toHaveLength(2);
    expect(switches[0]).toContain('data-checked');
    expect(switches[1]).toContain('data-unchecked');
  });
});
