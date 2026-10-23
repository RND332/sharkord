import { describe, expect, test } from 'bun:test';

const renderProfile = (argument?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './profile.render.tsx',
      ...(argument ? [argument] : [])
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

  return output.slice(marker + '__MARKUP__'.length);
};

describe('Profile', () => {
  test('should edit the bio in a transparent field', () => {
    const html = renderProfile();

    expect(html).toContain('<textarea');
    expect(html).toContain('aria-label="Bio"');
    expect(html).toContain('placeholder="Tell us about yourself..."');
    // the field carries no border, no surface and no padding of its own
    expect(html).toContain('border-0 bg-transparent p-0');
    expect(html).not.toContain('bg-input-surface');
    expect(html).not.toContain('px-3 py-2');
    // the placeholder keeps the muted color of the resting line
    expect(html).toContain('placeholder:text-muted-foreground');
  });

  test('should keep the height of the resting line so nothing shifts', () => {
    const html = renderProfile();

    expect(html).toContain('min-h-[21px]');
    expect(html).toContain('leading-[21px]');
    expect(html).toContain('rows="1"');
    // the field is always there, there is no second state to swap it with
    expect(html.match(/<textarea/g)?.length).toBe(1);
    expect(html).not.toContain('cursor-text');
  });

  test('should not ask for a confirmation to finish the bio', () => {
    const html = renderProfile();

    expect(html).not.toContain('aria-label="Save changes"');
    expect(html).not.toContain('Edit bio');
  });

  test('should show the saved bio inside the field', () => {
    const html = renderProfile('Hello there');

    expect(html).toContain('>Hello there</textarea>');
  });
});
