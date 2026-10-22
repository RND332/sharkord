import { describe, expect, test } from 'bun:test';

const renderPassword = (argument?: string) => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './password.render.tsx',
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

describe('Password', () => {
  test('should render every password field with its label', () => {
    const html = renderPassword();

    expect(html).toContain('Current Password');
    expect(html).toContain('New Password');
    expect(html).toContain('Confirm New Password');
    expect(html).toContain('Enter current password');
    expect(html).toContain('Enter a new password');
    expect(html).toContain('Re-enter the new password');
    expect(html).toContain('New password and confirmation must match.');
  });

  test('should keep the fields wired to the form', () => {
    const html = renderPassword();

    expect(html).toContain('name="currentPassword"');
    expect(html).toContain('name="newPassword"');
    expect(html).toContain('name="confirmNewPassword"');
    expect(html.match(/type="password"/g)?.length).toBe(3);
  });

  test('should place the current and the new password side by side', () => {
    const html = renderPassword();

    // the first two fields share a wrapping row, the confirmation sits below it
    expect(html).toContain('flex flex-wrap gap-5');
    expect(html.match(/basis-\[510px\]/g)?.length).toBe(3);
    expect(html).toContain('flex max-w-[1040px] flex-col gap-[22px]');
  });

  test('should use the compact field type scale of the design', () => {
    const html = renderPassword();

    expect(html.match(/text-\[13px\] leading-4 text-foreground/g)?.length).toBe(
      3
    );
    expect(html).toContain('text-[13px] leading-4 text-subtle-foreground');
    expect(html.match(/px-\[15px\]/g)?.length).toBe(3);
  });

  test('should keep the fields editable when the account has a password', () => {
    const html = renderPassword();

    expect(html).not.toContain('Managed by your identity provider');
    expect(html).not.toContain('disabled=""');
  });

  test('should explain a managed account and lock the fields', () => {
    const html = renderPassword('managed');

    expect(html).toContain('Managed by your identity provider');
    expect(html.match(/disabled=""/g)?.length).toBe(3);
  });
});
