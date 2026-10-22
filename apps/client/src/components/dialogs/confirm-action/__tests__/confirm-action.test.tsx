import { describe, expect, test } from 'bun:test';

const renderConfirmAction = (mode?: string) => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './confirm-action.render.tsx', ...(mode ? [mode] : [])],
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

describe('ConfirmActionDialog', () => {
  test('should keep the title in the header and the explanation in the body', () => {
    const html = renderConfirmAction();

    expect(html).toContain('data-slot="alert-dialog-header"');
    expect(html).toContain('data-slot="alert-dialog-title"');
    expect(html).toContain('Confirm Action');
    expect(html).toContain('px-6 pt-6 pb-5');
    expect(html).toContain('data-slot="alert-dialog-description"');
    expect(html).toContain('Are you sure you want to perform this action?');
    expect(html).toContain(
      'px-6 py-6 text-[15px] leading-[23px] text-foreground'
    );
  });

  test('should place the actions on the nav footer and keep them distinct', () => {
    const html = renderConfirmAction();

    expect(html).toContain('data-slot="alert-dialog-footer"');
    expect(html).toContain('bg-nav');
    expect(html).toContain('>Cancel</button>');
    expect(html).toContain('>Confirm</button>');
    expect(html).toContain('bg-raised');
    expect(html).toContain('bg-primary text-primary-foreground');
  });

  test('should use the title, the message and the labels of the caller', () => {
    const html = renderConfirmAction('danger');

    expect(html).toContain('Delete RND 332?');
    expect(html).toContain(
      'The user and every message of that user are removed. This cannot be undone.'
    );
    expect(html).toContain('>Delete User</button>');
    expect(html).toContain('>Keep the user</button>');
  });

  test('should keep the destructive colour of a destructive action', () => {
    const html = renderConfirmAction('danger');

    expect(html).toContain('bg-danger-solid');
    expect(html).not.toContain('bg-primary text-primary-foreground');
  });

  test('should keep the dialog on the compact surface of the design', () => {
    const html = renderConfirmAction();

    expect(html).toContain('sm:max-w-[410px]');
    expect(html).toContain('rounded-[12px]');
    expect(html).toContain('bg-canvas');
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-describedby=');
  });
});
