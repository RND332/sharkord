import { describe, expect, test } from 'bun:test';

const renderPermissions = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './permissions.render.tsx', ...(mode ? [mode] : [])],
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

describe('Channel permissions section', () => {
  test('should render the heading and the description of the section', () => {
    const html = renderPermissions();

    expect(html).toContain('>Permissions<');
    expect(html).toContain(
      'Set channel access for a role or individual member.'
    );
    expect(html).toContain('max-w-[900px]');
  });

  test('should keep the list and the editor in one compact panel', () => {
    const html = renderPermissions();

    expect(html).toContain(
      'flex w-full flex-col overflow-hidden rounded-[8px] border border-line bg-canvas md:flex-row'
    );
    expect(html).toContain('md:w-[250px]');
  });

  test('should render the overrides list with the groups of the design', () => {
    const html = renderPermissions();

    expect(html).toContain('>Overrides<');
    expect(html).toContain('aria-label="Add override"');
    expect(html).toContain('>Roles<');
    expect(html).toContain('>Members<');
    expect(html).toContain('Moderator');
    expect(html).toContain('rnd332');
    expect(html).toContain(
      'px-[10px] pt-3 pb-1 text-[10px] font-bold uppercase leading-3 tracking-[1px] text-subtle-foreground'
    );
  });

  test('should show the state of every channel permission', () => {
    const html = renderPermissions('editor');

    expect(html).toContain(
      'flex min-w-0 flex-1 flex-col gap-4 px-[24px] py-[20px]'
    );
    expect(html).toContain('>Moderator<');
    expect(html).toContain('>Role override<');
    expect(html).toContain('>Channel Permissions<');
    expect(html).toContain('>View Channel<');
    expect(html).toContain('>Send Messages<');
    expect(html).toContain('>Join Channel<');
    expect(html).toContain('>Speak<');
    expect(html).toContain('>Share Screen<');
    expect(html).toContain('>Enable Webcam<');
    expect(html).toContain('w-[52px] text-xs leading-4 text-accent-text');
    expect(html).toContain('>Allowed<');
    expect(html).toContain('>Denied<');
    expect(html).toContain(
      'min-h-[30px] items-center justify-between gap-4 border-b'
    );
  });

  test('should ask for a selection while no override is chosen', () => {
    const html = renderPermissions();

    expect(html).toContain(
      'Select a role or user to edit permissions, or add a new override'
    );
    expect(html).not.toContain('>Role override<');
  });

  test('should render the empty list without overrides', () => {
    const html = renderPermissions('empty');

    expect(html).toContain('No permission overrides yet');
    expect(html).not.toContain('>Moderator<');
    expect(html).not.toContain('>rnd332<');
  });

  test('should warn about a public channel', () => {
    const html = renderPermissions('public');

    expect(html).toContain('>Public channel<');
    expect(html).toContain('This is a public channel');
  });
});
