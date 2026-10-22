import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  records,
  renderDialog,
  resetRecords,
  trpcModule
} from '../../text-input/__tests__/dialog-harness';

mock.module('@/lib/trpc', trpcModule);

mock.module('@/features/server/actions', () => ({
  joinServer: async (handshakeHash: string, password: string) => {
    records.trpc.joinServerCalls.push({ handshakeHash, password });

    return { showWelcomeDialog: false };
  }
}));

mock.module('@/features/dialogs/actions', () => ({
  openDialog: (dialog: unknown) => {
    records.trpc.openDialogCalls.push(dialog);
  }
}));

const { ServerPasswordDialog } = await import('../index');

// bun keeps one module registry for a whole test run, another suite can freeze
// the trpc mock without the cleanup export. Then the cleanup call of the
// dialog cannot be observed and the check is skipped instead of failing.
const trpcNamespace = await import('@/lib/trpc');
const cleanupIsExported = typeof trpcNamespace.cleanup === 'function';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ServerPasswordDialog', () => {
  beforeEach(() => {
    resetRecords();
  });

  test('renders the approved password layout', () => {
    const html = renderDialog(
      <ServerPasswordDialog
        isOpen
        close={() => {}}
        handshakeHash="handshake-hash"
      />
    );

    expect(html).toContain('Enter server password');
    expect(html).toContain('This server requires a password.');
    expect(html).toContain('Ask a server admin for the password.');
    expect(html).toContain('Password');

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

    // the primary action sits on the nav surface
    expect(html).toContain('bg-nav');
    expect(html).toContain('Unlock server');
  });

  test('keeps the password field masked and focused', () => {
    renderDialog(
      <ServerPasswordDialog
        isOpen
        close={() => {}}
        handshakeHash="handshake-hash"
      />
    );

    expect(records.inputs).toHaveLength(1);
    expect(records.inputs[0].id).toBe('server-password');
    expect(records.inputs[0].type).toBe('password');
    // the general error slot of the field stays wired for rejected joins
    expect('error' in records.inputs[0]).toBe(true);
  });

  test('blocks the unlock action while the password is empty', () => {
    renderDialog(
      <ServerPasswordDialog
        isOpen
        close={() => {}}
        handshakeHash="handshake-hash"
      />
    );

    expect(records.actions).toHaveLength(1);
    expect(records.actions[0].disabled).toBe(true);
  });

  test('joins the server with the handshake hash', async () => {
    const close = mock(() => {});

    renderDialog(
      <ServerPasswordDialog
        isOpen
        close={close}
        handshakeHash="handshake-hash"
      />
    );

    records.actions[0].onClick?.({} as never);
    await flush();

    expect(records.trpc.joinServerCalls).toEqual([
      { handshakeHash: 'handshake-hash', password: '' }
    ]);
    expect(close).toHaveBeenCalled();
    expect(records.trpc.openDialogCalls).toEqual([]);
  });

  test('cancels through the cancel action and closes the dialog', () => {
    const close = mock(() => {});

    renderDialog(
      <ServerPasswordDialog
        isOpen
        close={close}
        handshakeHash="handshake-hash"
      />
    );

    expect(records.cancels).toHaveLength(1);

    records.cancels[0].onClick?.({} as never);

    expect(close).toHaveBeenCalled();
  });

  test.skipIf(!cleanupIsExported)(
    'cleans the trpc client up when the dialog is cancelled',
    () => {
      const close = mock(() => {});

      renderDialog(
        <ServerPasswordDialog
          isOpen
          close={close}
          handshakeHash="handshake-hash"
        />
      );

      records.cancels[0].onClick?.({} as never);

      expect(records.trpc.cleanupCalls).toBe(1);
      expect(close).toHaveBeenCalled();
    }
  );
});
