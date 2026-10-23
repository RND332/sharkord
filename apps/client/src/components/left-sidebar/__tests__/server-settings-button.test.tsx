import { describe, expect, test } from 'bun:test';

type TRenderResult = {
  html: string;
  screens: string[];
};

const renderServerSettingsButton = (mode?: string): TRenderResult => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './server-settings-button.render.tsx',
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

describe('Server settings button', () => {
  test('should render the cog right after the server name', () => {
    const { html } = renderServerSettingsButton();

    expect(html).toContain('aria-label="Server Settings"');
    expect(html).toContain('data-testid="server-settings-button"');
    expect(html).toContain('size-5 p-0');
  });

  test('should open the server settings when it is clicked', () => {
    const { screens } = renderServerSettingsButton();

    expect(screens).toEqual(['SERVER_SETTINGS']);
  });

  test('should stay away from a user without the server permissions', () => {
    const { html, screens } = renderServerSettingsButton('reader');

    expect(html).not.toContain('server-settings-button');
    expect(screens).toEqual([]);
  });
});
