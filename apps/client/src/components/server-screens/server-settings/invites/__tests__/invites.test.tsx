import { describe, expect, test } from 'bun:test';

const renderInvites = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './invites.render.tsx', ...(mode ? [mode] : [])],
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

describe('Invites settings table', () => {
  test('should render the compact link, role, expiry and uses columns', () => {
    const html = renderInvites();

    expect(html).toContain('Link');
    expect(html).toContain('Role');
    expect(html).toContain('Expires');
    expect(html).toContain('Uses');
    expect(html).toContain('w-[180px]');
    expect(html).toContain('w-[160px]');
    expect(html).toContain('w-[120px]');
    expect(html).toContain('w-[50px]');
    expect(html).toContain('py-[13px]');
    expect(html).toContain('divide-y divide-line');
  });

  test('should render the invite link with a named copy action', () => {
    const html = renderInvites();

    expect(html).toContain(
      'title="https://discord.rnd332.com/?invite=community"'
    );
    expect(html).toContain('https://discord.rnd332.com/?invite=community');
    expect(html).toContain('aria-label="Copy Invite Link"');
  });

  test('should render the role of the invite and the default fallback', () => {
    const html = renderInvites();

    expect(html).toContain('Moderator');
    expect(html).toContain('Default');
  });

  test('should render the expiry and the uses of the invite', () => {
    const html = renderInvites();

    expect(html).toContain('in 7 days');
    expect(html).toContain('Never');
    expect(html).toContain('3 / ∞</span>');
    expect(html).toContain('3 / 10');
  });

  test('should mark an expired invite', () => {
    const html = renderInvites('expired');

    expect(html).toContain('Expired');
    expect(html).toContain('text-destructive');
  });

  test('should keep the copy and delete actions named', () => {
    const html = renderInvites();

    expect(html).toContain('aria-label="Invite actions for community"');
    expect(html).toContain('aria-label="Invite actions for team"');
    expect(html).toContain('Copy Invite Link');
    expect(html).toContain('Delete');
  });

  test('should place the search next to the heading and keep the create action', () => {
    const html = renderInvites();

    const headerStart = html.indexOf('pb-[14px]');
    const titleIndex = html.indexOf('>Invites<');
    const searchIndex = html.indexOf(
      'placeholder="Search invites by code or creator..."'
    );
    const tableIndex = html.indexOf('max-w-[1040px]');

    expect(headerStart).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(headerStart);
    expect(searchIndex).toBeGreaterThan(titleIndex);
    expect(searchIndex).toBeLessThan(tableIndex);
    expect(html).toContain('w-[280px]');
    expect(html).toContain('aria-label="Create Invite"');
    expect(html).toContain('size-[38px]');
    expect(html).toContain('rounded-[7px] bg-raised');
  });

  test('should truncate a long invite code', () => {
    const html = renderInvites('long');

    expect(html).toContain(
      'title="https://discord.rnd332.com/?invite=a-very-long-invite-code-that-does-not-fit-into-the-link-cell"'
    );
    expect(html).toContain('truncate text-sm leading-[18px] text-foreground');
  });

  test('should render the empty state without invites', () => {
    const html = renderInvites('empty');

    expect(html).toContain('No invites found');
    expect(html).not.toContain('Copy Invite Link');
  });
});
