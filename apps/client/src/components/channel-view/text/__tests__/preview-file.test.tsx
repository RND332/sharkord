import { expect, test } from 'bun:test';

const renderPreview = (mode: string, progress?: number): string => {
  const args = ['bun', 'run', './preview-file.render.tsx', mode];

  if (progress !== undefined) {
    args.push(String(progress));
  }

  const proc = Bun.spawnSync({
    cmd: args,
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

const visibleText = (html: string): string => html.replace(/<[^>]*>/g, ' ');

const dashOffset = (html: string): number => {
  const match = html.match(/stroke-dashoffset="([\d.]+)"/);

  if (!match) {
    throw new Error(`no dash offset in the markup:\n${html}`);
  }

  return Number(match[1]);
};

test('the uploading image shows a circular loader with the real progress', () => {
  const html = renderPreview('image', 45);

  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-valuenow="45"');
  expect(visibleText(html)).toContain('45%');
  expect(dashOffset(html)).toBeGreaterThan(0);
});

test('the loader follows the uploaded progress', () => {
  const slow = renderPreview('image', 45);
  const fast = renderPreview('image', 80);

  expect(slow).toContain('aria-valuenow="45"');
  expect(fast).toContain('aria-valuenow="80"');
  expect(dashOffset(fast)).toBeLessThan(dashOffset(slow));
});

test('the image preview drops the file name', () => {
  const html = renderPreview('image', 45);

  expect(visibleText(html)).not.toContain('image.png');
});

test('the document card keeps the file name and the size', () => {
  const html = renderPreview('document', 45);

  expect(visibleText(html)).toContain('report.txt');
  expect(visibleText(html)).toContain('64 B');
  expect(html).toContain('role="progressbar"');
});

test('the uploaded image keeps no loader', () => {
  const html = renderPreview('image-done');

  expect(html).not.toContain('role="progressbar"');
  expect(visibleText(html)).not.toContain('image.png');
});
