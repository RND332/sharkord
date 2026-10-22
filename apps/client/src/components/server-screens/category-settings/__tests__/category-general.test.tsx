import { describe, expect, test } from 'bun:test';

type TRenderResult = {
  html: string;
  records: {
    updates: { categoryId: number; name: string }[];
    toasts: { type: string; message: string }[];
  };
};

const renderCategory = (argument?: string): TRenderResult => {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      'run',
      './category-general.render.tsx',
      ...(argument ? [argument] : [])
    ],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();
  const markupIndex = output.indexOf('__MARKUP__');
  const recordsIndex = output.indexOf('__RECORDS__');

  if (markupIndex === -1 || recordsIndex === -1) {
    throw new Error(`no markup in the render output:\n${output}`);
  }

  return {
    html: output.slice(markupIndex + '__MARKUP__'.length, recordsIndex).trim(),
    records: JSON.parse(
      output.slice(recordsIndex + '__RECORDS__'.length).trim()
    ) as TRenderResult['records']
  };
};

describe('Category settings editor', () => {
  test('should render the name group of the design', () => {
    const { html } = renderCategory();

    expect(html).toContain('Text channels');
    expect(html).toContain('Organize related channels under one category.');
    expect(html).toContain('Category name');
    expect(html).toContain('text-[13px] font-semibold leading-[18px]');
    expect(html).toContain(
      'h-[44px] max-w-[550px] rounded-[8px] border-control-border px-[13px]'
    );
    expect(html).toContain('max-w-[880px]');
    expect(html).toContain('gap-[22px]');
  });

  test('should render the save action of the design', () => {
    const { html } = renderCategory();

    expect(html).toContain('Save category');
    expect(html).toContain(
      'h-[42px] min-w-[156px] gap-[7px] rounded-[8px] pl-[12px] pr-[14px]'
    );
    expect(html).toContain('text-[13px] leading-[18px]');
    expect(html).toContain('bg-primary');
    expect(html).toContain('size-6');
  });

  test('should update the category once and report the success', () => {
    const { records } = renderCategory();

    expect(records.updates).toEqual([{ categoryId: 7, name: 'Text channels' }]);
    expect(records.toasts).toEqual([
      { type: 'success', message: 'Category updated' }
    ]);
  });

  test('should report the failure of the update', () => {
    const { records } = renderCategory('fail');

    expect(records.updates).toHaveLength(1);
    expect(records.toasts).toEqual([
      { type: 'error', message: 'Category name is taken' }
    ]);
  });
});
