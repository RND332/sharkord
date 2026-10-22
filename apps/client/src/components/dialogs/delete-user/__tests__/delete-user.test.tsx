import { describe, expect, test } from 'bun:test';

const renderDeleteUser = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './delete-user.render.tsx'],
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

describe('DeleteUserDialog', () => {
  test('should render the approved delete dialog layout', () => {
    const html = renderDeleteUser();

    expect(html).toContain('Delete user');
    expect(html).toContain('Remove this account from the server.');
    expect(html).toContain('Delete mika from Rnd Community?');
    expect(html).toContain(
      'Their account and server content will be removed. This cannot be undone.'
    );
    expect(html).toContain('TYPE DELETE TO CONFIRM');
    expect(html).toContain('placeholder="DELETE"');
    expect(html).toContain('id="delete-user-confirmation"');

    // compact surface: the shell is sectioned instead of padded as one box
    expect(html).toContain('gap-0');
    expect(html).toContain('p-0');
    expect(html).toContain('px-6');
    expect(html).toContain('pt-6');
    expect(html).toContain('pb-5');

    // title and description follow the approved type scale
    expect(html).toContain('text-[20px]');
    expect(html).toContain('text-[13px]');

    // the field label is the uppercase eyebrow of the design
    expect(html).toContain('uppercase');
    expect(html).toContain('tracking-[0.07em]');
    expect(html).toContain('text-subtle-foreground');

    // the actions sit on the nav surface
    expect(html).toContain('bg-nav');
  });

  test('should keep the destructive action locked until the word is typed', () => {
    const html = renderDeleteUser();

    expect(html).toContain('bg-danger-solid text-white');
    expect(html).toContain('disabled="">Delete user</button>');
    expect(html).not.toContain('disabled="">Cancel</button>');
  });
});
