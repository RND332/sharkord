import { expect, test } from 'bun:test';

const renderCompose = (mode: string): string => {
  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', './message-compose.render.tsx', mode],
    cwd: import.meta.dir,
    stdout: 'pipe',
    stderr: 'pipe'
  });

  if (!proc.success) {
    throw new Error(proc.stderr.toString());
  }

  const output = proc.stdout.toString();
  const marker = output.indexOf('__MARKUP__');

  if (marker === -1) {
    throw new Error(`no markup in the render output:\n${output}`);
  }

  return output.slice(marker + '__MARKUP__'.length).trim();
};

// the blocks of the message box in the order they are rendered
const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

const composeBlocks = (html: string): string[] => {
  const blocks: string[] = [];
  let depth = 0;
  let rowDepth = -1;

  new HTMLRewriter()
    .on('*', {
      element(el) {
        const isRow = (el.getAttribute('class') ?? '').includes(
          'compose-scroll-row'
        );

        if (isRow) {
          rowDepth = depth;
        } else if (depth === rowDepth + 1) {
          if (el.getAttribute('data-compose-attachments') !== null) {
            blocks.push('attachments');
          }

          if (el.getAttribute('data-compose-controls') !== null) {
            blocks.push('controls');
          }
        }

        if (voidTags.has(el.tagName)) {
          return;
        }

        depth += 1;

        el.onEndTag(() => {
          depth -= 1;
        });
      }
    })
    .transform(html);

  return blocks;
};

const controlsMarkup = (html: string): string => {
  const index = html.indexOf('data-compose-controls');

  if (index === -1) {
    throw new Error(`no controls in the markup:\n${html}`);
  }

  return html.slice(index);
};

test('the message box keeps the controls as its last block', () => {
  expect(composeBlocks(renderCompose('empty'))).toEqual(['controls']);
});

test('the message box renders the attachment preview above the controls', () => {
  const html = renderCompose('attachment');

  expect(html).toContain('data-attachment-preview');
  expect(composeBlocks(html)).toEqual(['attachments', 'controls']);
});

test('the message box renders the same controls with and without an image', () => {
  const withoutImage = renderCompose('empty');
  const withImage = renderCompose('attachment');

  expect(controlsMarkup(withImage)).toBe(controlsMarkup(withoutImage));
});
