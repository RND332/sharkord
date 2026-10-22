import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { records, renderDialog, resetRecords } from './dialog-harness';

const { TextInputDialog } = await import('../index');

describe('TextInputDialog', () => {
  beforeEach(() => {
    resetRecords();
  });

  test('renders the approved text input layout', () => {
    const html = renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
        message="Change the name shown in the sidebar."
        label="Name"
        helper="Visible to everyone who can access this channel."
      />
    );

    expect(html).toContain('Rename channel');
    expect(html).toContain('Change the name shown in the sidebar.');
    expect(html).toContain('Name');
    expect(html).toContain('Visible to everyone who can access this channel.');

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
  });

  test('falls back to a generic field label', () => {
    const html = renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
      />
    );

    expect(html).toContain('Value');
  });

  test('keeps the field connected to the dialog state', () => {
    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
      />
    );

    expect(records.inputs).toHaveLength(1);
    expect(records.inputs[0].id).toBe('text-input-value');
    expect(records.inputs[0].autoFocus).toBe(true);
    expect(records.inputs[0].onEnter).toBeInstanceOf(Function);
  });

  test('blocks the confirm action while the field is empty', () => {
    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
      />
    );

    expect(records.actions).toHaveLength(1);
    expect(records.actions[0].disabled).toBe(true);
  });

  test('allows an empty confirmation when the caller allows it', () => {
    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Kick user"
        allowEmpty
      />
    );

    expect(records.actions[0].disabled).toBe(false);
  });

  test('confirms through the primary action', () => {
    const onConfirm = mock((_text: string | undefined) => {});

    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
        onConfirm={onConfirm}
      />
    );

    records.actions[0].onClick?.({} as never);

    expect(onConfirm).toHaveBeenCalled();
  });

  test('confirms through the keyboard', () => {
    const onConfirm = mock((_text: string | undefined) => {});

    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={() => {}}
        title="Rename channel"
        onConfirm={onConfirm}
      />
    );

    records.inputs[0].onEnter?.();

    expect(onConfirm).toHaveBeenCalled();
  });

  test('cancels through the cancel action', () => {
    const onCancel = mock(() => {});
    const close = mock(() => {});

    renderDialog(
      <TextInputDialog
        isOpen
        isModalOpen
        close={close}
        title="Rename channel"
        onCancel={onCancel}
      />
    );

    expect(records.cancels).toHaveLength(1);

    records.cancels[0].onClick?.({} as never);

    expect(onCancel).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
