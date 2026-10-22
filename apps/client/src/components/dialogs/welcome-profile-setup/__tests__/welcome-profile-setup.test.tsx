import { describe, expect, test } from 'bun:test';

const renderWelcomeProfileSetup = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './welcome-profile-setup.render.tsx',
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

describe('WelcomeProfileSetupDialog', () => {
  test('should group the identity fields as in the design', () => {
    const html = renderWelcomeProfileSetup();

    expect(html).toContain('size-[70px]');
    expect(html).toContain('Change avatar');
    expect(html).toContain('Display name');
    expect(html).toContain(
      'text-xs leading-4 font-bold uppercase tracking-[0.07em] text-subtle-foreground'
    );
    expect(html).toContain('id="welcome-display-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('value="rnd332"');
  });

  test('should keep the optional profile capabilities and the image actions', () => {
    const html = renderWelcomeProfileSetup();

    expect(html).toContain('About you');
    expect(html).toContain('data-slot="textarea"');
    expect(html).toContain('placeholder="Tell us about yourself..."');
    expect(html).toContain('Banner');
    expect(html).toContain('aria-label="Change banner"');
    expect(html).toContain('aria-label="Remove avatar"');
    expect(html).toContain('aria-label="Remove banner"');
    expect(html).toContain('You can edit your profile any time in Settings.');
  });

  test('should keep the finish and the skip actions', () => {
    const html = renderWelcomeProfileSetup();

    expect(html).toContain('>Skip</button>');
    expect(html).toContain('>Save and continue</button>');
    expect(html).toContain('bg-nav');
    expect(html).toContain('sm:max-w-[410px]');
    expect(html).toContain('rounded-[12px]');
  });

  test('should show the initials and hide the image actions without images', () => {
    const html = renderWelcomeProfileSetup('empty');

    expect(html).toContain('>R</span>');
    expect(html).not.toContain('aria-label="Remove avatar"');
    expect(html).not.toContain('aria-label="Remove banner"');
  });
});
