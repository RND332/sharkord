import { describe, expect, test } from 'bun:test';

const renderUsers = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './users.render.tsx', ...(mode ? [mode] : [])],
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

describe('Users settings table', () => {
  test('should render the compact member, role and status columns', () => {
    const html = renderUsers();

    expect(html).toContain('Member');
    expect(html).toContain('Role');
    expect(html).toContain('Status');
    expect(html).toContain('w-[180px]');
    expect(html).toContain('w-[90px]');
    expect(html).toContain('w-[44px]');
    expect(html).toContain('py-[13px]');
    expect(html).toContain('divide-y divide-line');
  });

  test('should render a row per user with avatar, nickname, roles and status', () => {
    const html = renderUsers();

    expect(html).toContain('data-testid="user-avatar" data-user-id="1"');
    expect(html).toContain('aria');
    expect(html).toContain('size-6 flex-shrink-0');
    expect(html).toContain('Moderator');
    expect(html).toContain('text-success');
    expect(html).toContain('online');
    expect(html).toContain('offline');
  });

  test('should place the search next to the heading instead of a separate row', () => {
    const html = renderUsers();

    const headerStart = html.indexOf('pb-[14px]');
    const titleIndex = html.indexOf('>Users<');
    const searchIndex = html.indexOf(
      'placeholder="Search users by name or identity..."'
    );
    const tableIndex = html.indexOf('max-w-[1040px]');

    expect(headerStart).toBeGreaterThan(-1);
    expect(titleIndex).toBeGreaterThan(headerStart);
    expect(searchIndex).toBeGreaterThan(titleIndex);
    expect(searchIndex).toBeLessThan(tableIndex);
    expect(html).toContain('w-[280px]');
    expect(html).toContain('rounded-sm border-control-border bg-input-surface');
  });

  test('should keep the moderation and deletion actions named', () => {
    const html = renderUsers();

    expect(html).toContain('aria-label="User actions for aria"');
    expect(html).toContain('aria-label="User actions for jules"');
    expect(html).toContain('Moderate User');
    expect(html).toContain('Delete');
  });

  test('should not offer the deletion of the own account', () => {
    const html = renderUsers('own');

    expect(html).toContain('aria-label="User actions for aria"');
    expect(html).toContain('Moderate User');
    expect(html.match(/data-testid="dropdown-menu-item"/g)).toHaveLength(1);
    expect(html).not.toContain('Delete');
  });

  test('should truncate long values and keep them in the title', () => {
    const html = renderUsers('long');

    expect(html).toContain(
      'title="a-nickname-that-is-way-too-long-for-the-member-cell"'
    );
    expect(html).toContain('truncate text-sm leading-[18px] text-foreground');
  });

  test('should render a user without a bio and without roles', () => {
    const html = renderUsers();

    expect(html).toContain('jules');
    expect(html).not.toContain('Keeps the server calm');
    expect(html).not.toContain('title=""');
  });

  test('should render the empty state without users', () => {
    const html = renderUsers('empty');

    expect(html).toContain('No users found');
    expect(html).not.toContain('data-testid="user-avatar"');
  });
});
