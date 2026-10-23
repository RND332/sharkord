import { describe, expect, test } from 'bun:test';

const renderPluginInstallConfirm = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './plugin-install-confirm.render.tsx'],
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

describe('PluginInstallConfirmDialog', () => {
  test('should keep the code execution warning visible', () => {
    const html = renderPluginInstallConfirm();

    expect(html).toContain('What plugins can do');
    expect(html).toContain('Plugins can read, modify, or delete');
    expect(html).toContain('all server data');
    expect(html).toContain('Plugins can execute');
    expect(html).toContain('arbitrary code');
    expect(html).toContain('user accounts, steal data, or damage your server');
    expect(html.match(/text-destructive/g)?.length).toBe(3);
  });

  test('should not claim a sandbox or enforced restrictions', () => {
    const html = renderPluginInstallConfirm();

    expect(html).not.toContain('sandbox');
    expect(html).not.toContain('Sandbox');
    expect(html).not.toContain('allowed channels');
    expect(html).not.toContain('THIS PLUGIN CAN');
  });

  test('should keep the countdown and the confirm and cancel actions', () => {
    const html = renderPluginInstallConfirm();

    expect(html).toContain('Wait (10s)');
    expect(html).toContain('disabled=""');
    expect(html).toContain('>Cancel</button>');
    expect(html).toContain('bg-danger-solid');
    expect(html).toContain('bg-raised');
  });

  test('should use the compact surface of the design', () => {
    const html = renderPluginInstallConfirm();

    expect(html).toContain('sm:max-w-[410px]');
    expect(html).toContain('rounded-[12px]');
    expect(html).toContain('bg-canvas');
    expect(html).toContain('bg-nav');
    expect(html).toContain('size-[46px]');
    expect(html).toContain(
      'text-[13px] font-bold leading-4 uppercase tracking-[0.07em] text-subtle-foreground'
    );
    // the dom keeps the quotes of the title as they are, the server renderer
    // escaped them
    expect(html).toContain('Install "Polls" plugin?');
    expect(html).toContain('Review the risks before adding it.');
  });

  test('should keep the plugin name and the security docs link', () => {
    const html = renderPluginInstallConfirm();

    expect(html).toContain('Polls');
    expect(html).toContain('https://sharkord.com/docs/plugins/security');
  });
});
