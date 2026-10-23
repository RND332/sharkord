import { describe, expect, test } from 'bun:test';

// the chevron control is the only button of the small variant, the action
// control the only one of the medium variant
const CHEVRON_MARKER = 'size-5 p-1';
const ACTION_MARKER = 'size-7 p-1.5';

const renderHeaders = () => {
  const result = Bun.spawnSync({
    cmd: ['bun', 'run', './sidebar-headers.render.tsx'],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!result.success) {
    throw new Error(result.stderr.toString());
  }

  const output = result.stdout.toString();
  const directChannelsIndex = output.indexOf('__DIRECT_CHANNELS__');
  const categoriesIndex = output.indexOf('__CATEGORIES__');

  if (directChannelsIndex === -1 || categoriesIndex === -1) {
    throw new Error(`no markup in the render output:\n${output}`);
  }

  return {
    directChannels: output.slice(
      directChannelsIndex + '__DIRECT_CHANNELS__'.length,
      categoriesIndex
    ),
    categories: output.slice(categoriesIndex + '__CATEGORIES__'.length).trim()
  };
};

const controlClasses = (html: string, marker: string): string => {
  const classes = Array.from(html.matchAll(/<button[^>]*class="([^"]*)"/g)).map(
    (match) => match[1] ?? ''
  );
  const found = classes.find((value) => value.includes(marker));

  if (!found) {
    throw new Error(`no control with ${marker} in the markup`);
  }

  return found;
};

describe('sidebar section headers', () => {
  test('should place the direct channels chevron in the category chevron column', () => {
    const { directChannels, categories } = renderHeaders();

    expect(controlClasses(directChannels, CHEVRON_MARKER)).toBe(
      controlClasses(categories, CHEVRON_MARKER)
    );
    expect(controlClasses(directChannels, CHEVRON_MARKER)).toContain('-ml-1.5');
  });

  test('should place the direct channels action in the category action column', () => {
    const { directChannels, categories } = renderHeaders();

    expect(controlClasses(directChannels, ACTION_MARKER)).toBe(
      controlClasses(categories, ACTION_MARKER)
    );
    expect(controlClasses(directChannels, ACTION_MARKER)).toContain('-mr-1.5');
  });

  test('should keep the gap between the chevron and the label of both headers', () => {
    const { directChannels, categories } = renderHeaders();

    expect(directChannels).toContain('items-center gap-1.5 px-2.5');
    expect(categories).toContain('items-center gap-1.5');
  });

  test('should keep the direct channels disclosure named and collapsible', () => {
    const { directChannels } = renderHeaders();

    expect(directChannels).toMatch(
      /<button type="button" aria-label="Direct Channels" aria-expanded="false"/
    );
    expect(directChannels).toContain('title="Expand direct channels"');
  });
});
