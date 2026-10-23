import { describe, expect, test } from 'bun:test';

type TRenderResult = {
  html: string;
  dialogs: string[];
};

const renderSidebarContextMenu = (mode?: string): TRenderResult => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './sidebar-context-menu.render.tsx',
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
  const marker = output.indexOf('__RESULT__');

  if (marker === -1) {
    throw new Error(`no result in the render output:\n${output}`);
  }

  return JSON.parse(
    output.slice(marker + '__RESULT__'.length).trim()
  ) as TRenderResult;
};

describe('Sidebar context menu', () => {
  test('should offer the category creation in the side menu', () => {
    const { html } = renderSidebarContextMenu();

    expect(html).toContain('Add Category');
    expect(html).toContain('sidebar');
  });

  test('should open the create category dialog from the menu item', () => {
    const { dialogs } = renderSidebarContextMenu();

    expect(dialogs).toEqual(['CREATE_CATEGORY']);
  });

  test('should stay away from a user without the category permission', () => {
    const { html, dialogs } = renderSidebarContextMenu('reader');

    expect(html).not.toContain('Add Category');
    expect(dialogs).toEqual([]);
  });
});
