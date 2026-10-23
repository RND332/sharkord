import { describe, expect, test } from 'bun:test';

type TRenderResult = {
  profileHtml: string;
  pickerHtml: string;
  closedPickerHtml: string;
};

const renderProfile = (bio?: string): TRenderResult => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './profile.render.tsx', ...(bio ? [bio] : [])],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();

  const read = (marker: string) => {
    const start = output.indexOf(marker);

    if (start === -1) {
      throw new Error(`no ${marker} in the render output:\n${output}`);
    }

    const rest = output.slice(start + marker.length);
    const end = rest.indexOf('\n');

    return end === -1 ? rest : rest.slice(0, end);
  };

  return {
    profileHtml: read('__PROFILE__'),
    pickerHtml: read('__PICKER__'),
    closedPickerHtml: read('__CLOSED__')
  };
};

describe('Profile', () => {
  test('should not keep a separate section to pick the profile color', () => {
    const { profileHtml } = renderProfile();

    expect(profileHtml).not.toContain('Profile color');
    expect(profileHtml).not.toContain(
      'rounded-md border border-line bg-nav p-3'
    );
    expect(profileHtml).not.toContain('react-colorful');
  });

  test('should anchor the color picker to the banner', () => {
    const { profileHtml } = renderProfile();

    expect(profileHtml).toContain('data-profile-banner');
    expect(profileHtml).toContain('data-slot="popover-anchor"');
  });

  test('should open the color picker with the hex picker and the hex field', () => {
    const { pickerHtml } = renderProfile();

    expect(pickerHtml).toContain('react-colorful');
    expect(pickerHtml).toContain('aria-label="Profile color"');
    expect(pickerHtml).toContain('value="#5865f2"');
    expect(pickerHtml).toContain('Reset');
  });

  test('should keep the color picker closed until it is opened', () => {
    const { closedPickerHtml } = renderProfile();

    expect(closedPickerHtml).not.toContain('react-colorful');
  });

  test('should edit the bio in a transparent field', () => {
    const { profileHtml } = renderProfile();

    expect(profileHtml).toContain('<textarea');
    expect(profileHtml).toContain('aria-label="Bio"');
    expect(profileHtml).toContain('placeholder="Tell us about yourself..."');
    // the field carries no border, no surface and no padding of its own
    expect(profileHtml).toContain('border-0 bg-transparent p-0');
    expect(profileHtml).not.toContain('bg-input-surface');
    expect(profileHtml).not.toContain('px-3 py-2');
    // the placeholder keeps the muted color of the resting line
    expect(profileHtml).toContain('placeholder:text-muted-foreground');
  });

  test('should keep the height of the resting line so nothing shifts', () => {
    const { profileHtml } = renderProfile();

    expect(profileHtml).toContain('min-h-[21px]');
    expect(profileHtml).toContain('leading-[21px]');
    expect(profileHtml).toContain('rows="1"');
    // the field is always there, there is no second state to swap it with
    expect(profileHtml.match(/<textarea/g)?.length).toBe(1);
    expect(profileHtml).not.toContain('cursor-text');
  });

  test('should not ask for a confirmation to finish the bio', () => {
    const { profileHtml } = renderProfile();

    expect(profileHtml).not.toContain('aria-label="Save changes"');
    expect(profileHtml).not.toContain('Edit bio');
  });

  test('should show the saved bio inside the field', () => {
    const { profileHtml } = renderProfile('Hello there');

    expect(profileHtml).toContain('>Hello there</textarea>');
  });
});
