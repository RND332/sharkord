import { describe, expect, test } from 'bun:test';

const renderNotifications = (enabled = 'sounds,sentSound') => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './notifications.render.tsx', enabled],
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

describe('Notifications', () => {
  test('should keep every notification choice available', () => {
    const html = renderNotifications();

    expect(html).toContain('All Messages');
    expect(html).toContain('Mentions Only');
    expect(html).toContain('Direct Messages');
    expect(html).toContain('Replies to Me');
    expect(html).toContain('Notification Sounds');
    expect(html).toContain('Message Sent Sound');
    expect(html.match(/role="switch"/g)?.length).toBe(6);
  });

  test('should render the rows with a label on the left and a switch on the right', () => {
    const html = renderNotifications();
    const rows = html
      .split(
        'flex w-full items-center justify-between gap-4 border-b border-line py-[15px]'
      )
      .slice(1);

    // six notification rows plus the row that opens the sound settings dialog
    expect(rows).toHaveLength(7);
    expect(rows.filter((row) => row.includes('role="switch"'))).toHaveLength(6);
    expect(
      html.match(/text-sm leading-\[18px\] text-foreground/g)?.length
    ).toBe(7);
    expect(
      html.match(/text-\[13px\] leading-4 text-muted-foreground/g)?.length
    ).toBe(7);
    expect(html).toContain('flex w-full items-center justify-between gap-4');
    expect(html).toContain('flex max-w-[1040px] flex-col');
  });

  test('should offer the sound settings dialog as a separate row', () => {
    const html = renderNotifications();
    const soundSettingsRow = html
      .split(
        'flex w-full items-center justify-between gap-4 border-b border-line py-[15px]'
      )
      .slice(1)
      .find((row) => row.includes('Sound settings'));

    expect(soundSettingsRow).toBeDefined();
    expect(soundSettingsRow).toContain('Choose what you hear in calls.');
    expect(soundSettingsRow).toContain('>Open<');
    // the row opens a dialog, it does not add another notification switch
    expect(soundSettingsRow).not.toContain('role="switch"');
  });

  test('should reflect the saved values of every choice', () => {
    const html = renderNotifications('all,mentions,sounds,sentSound');

    // all messages, mentions, the sounds and the sent sound are on
    expect(html.match(/aria-checked="true"/g)?.length).toBe(4);
    expect(html.match(/aria-checked="false"/g)?.length).toBe(2);
  });

  test('should disable the sent sound while the sounds are off', () => {
    const html = renderNotifications('sentSound');

    expect(html).toContain('Message Sent Sound');
    const disabledSwitches =
      html.match(/<span[^>]*data-disabled=""[^>]*role="switch"[^>]*>/g) ?? [];

    expect(disabledSwitches).toHaveLength(1);
  });
});
