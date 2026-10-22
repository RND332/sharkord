import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  records,
  renderDialog,
  resetRecords,
  trpcModule
} from '../../text-input/__tests__/dialog-harness';

mock.module('@/lib/trpc', trpcModule);

const { CreateCategoryDialog } = await import('../index');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CreateCategoryDialog', () => {
  beforeEach(() => {
    resetRecords();
  });

  test('renders the approved category layout', () => {
    const html = renderDialog(<CreateCategoryDialog isOpen close={() => {}} />);

    expect(html).toContain('Create a category');
    expect(html).toContain('Organize channels around a topic.');
    expect(html).toContain('Category name');
    expect(html).toContain(
      'New channels can be added here after you create the category.'
    );

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
    expect(html).toContain('Create category');
  });

  test('keeps the field connected to the form state', () => {
    renderDialog(<CreateCategoryDialog isOpen close={() => {}} />);

    expect(records.inputs).toHaveLength(1);
    expect(records.inputs[0].id).toBe('create-category-name');
    expect(records.inputs[0].value).toBe('New Category');
    expect(records.inputs[0].onEnter).toBeInstanceOf(Function);
  });

  test('submits the category through the primary action', async () => {
    const close = mock(() => {});

    renderDialog(<CreateCategoryDialog isOpen close={close} />);

    expect(records.buttons).toHaveLength(1);

    records.buttons[0].onClick?.({} as never);
    await flush();

    expect(records.trpc.categoryAdds).toEqual([{ name: 'New Category' }]);
    expect(close).toHaveBeenCalled();
  });

  test('submits the category through the keyboard', async () => {
    const close = mock(() => {});

    renderDialog(<CreateCategoryDialog isOpen close={close} />);

    records.inputs[0].onEnter?.();
    await flush();

    expect(records.trpc.categoryAdds).toEqual([{ name: 'New Category' }]);
    expect(close).toHaveBeenCalled();
  });

  test('keeps the dialog open when the request fails', async () => {
    const close = mock(() => {});

    records.trpc.failNextCategoryAdd = true;

    renderDialog(<CreateCategoryDialog isOpen close={close} />);

    records.buttons[0].onClick?.({} as never);
    await flush();

    expect(records.trpc.categoryAdds).toEqual([]);
    expect(close).not.toHaveBeenCalled();
  });
});
