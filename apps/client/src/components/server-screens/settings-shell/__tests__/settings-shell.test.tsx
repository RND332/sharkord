import { describe, expect, test } from 'bun:test';

const renderSettingsShell = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './settings-shell.render.tsx'],
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

const getCloseButtonClasses = (html: string): string[] => {
  const button = html.match(/<button\b[^>]*aria-label="Close"[^>]*>/);

  if (!button) {
    throw new Error(`no close button in the render output:\n${html}`);
  }

  const classAttribute = button[0].match(/class="([^"]*)"/);

  if (!classAttribute) {
    throw new Error(`the close button has no class:\n${button[0]}`);
  }

  return classAttribute[1]
    .replace(/&amp;/g, '&')
    .split(/\s+/)
    .filter((token) => token.length > 0);
};

describe('SettingsShell close button', () => {
  test('should render the close button of the settings', () => {
    const html = renderSettingsShell();

    expect(html).toContain('aria-label="Close"');
  });

  test('should render the close button bigger than the default icon button', () => {
    const classes = getCloseButtonClasses(renderSettingsShell());

    expect(classes).toContain('size-10');
    expect(classes).not.toContain('size-9');
    expect(classes).toContain('[&_svg]:size-6');
    expect(classes).not.toContain('[&_svg]:size-5');
  });

  test('should render the close button with a rounded border around it', () => {
    const classes = getCloseButtonClasses(renderSettingsShell());

    expect(classes).toContain('rounded-full');
    expect(classes).toContain('border');
    expect(classes).toContain('border-line');
  });
});
