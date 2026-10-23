import { expect, test } from 'bun:test';

type TRenderResult = {
  catalogMarkup: string;
  previewMarkup: string;
  toastMarkup: string;
  sectionMarkup: string;
};

const runRender = (): TRenderResult => {
  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', './theme-catalog.render.tsx'],
    cwd: import.meta.dir
  });

  const stdout = proc.stdout.toString();

  expect(proc.exitCode).toBe(0);
  expect(stdout).toContain('__RESULT__');

  const marker = '__RESULT__';
  const lines = stdout.split('\n');
  const resultLine = lines.find((line) => line.startsWith(marker));

  expect(resultLine).toBeDefined();

  return JSON.parse(resultLine!.slice(marker.length)) as TRenderResult;
};

test('the catalog toolbar shows the theme count and the search field', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup).toContain('Themes · 106');
  expect(catalogMarkup).toContain('role="status"');
  expect(catalogMarkup).toContain('aria-label="Search themes"');
  expect(catalogMarkup).toContain('placeholder="Search themes"');
});

test('the catalog area is bounded in height and scrolls', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup).toContain('max-h-[380px]');
  expect(catalogMarkup).toContain('overflow-y-auto');
});

test('the catalog stays one alphabetical list without groups', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup.match(/<ul/g)?.length).toBe(1);
  expect(catalogMarkup.indexOf('Alabaster')).toBeGreaterThan(-1);
  expect(catalogMarkup.indexOf('Alabaster')).toBeLessThan(
    catalogMarkup.indexOf('Amethyst')
  );
});

test('every theme card keeps a compact preview', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup).toContain('viewBox="0 0 262 82"');
  expect(catalogMarkup).toContain('h-[82px]');
});

test('the selected Miku theme stays marked in the catalog', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup).toContain('Hatsune Miku');
  expect(catalogMarkup).toContain('aria-pressed="true"');
});

test('the catalog does not mention where the imported palettes come from', () => {
  const { catalogMarkup } = runRender();

  expect(catalogMarkup).not.toContain('Oh My Pi');
  expect(catalogMarkup).not.toContain('oh-my-pi');
  expect(catalogMarkup).not.toContain('Palette source');
});

test('the chat preview and the preview toast keep working', () => {
  const { previewMarkup, toastMarkup, sectionMarkup } = runRender();

  expect(previewMarkup).toContain('data-theme-preview="hatsune-miku"');
  expect(sectionMarkup).toContain('Current: Hatsune Miku');
  expect(toastMarkup).toContain('Previewing Hatsune Miku');
  expect(toastMarkup).toContain('Cancel');
  expect(toastMarkup).toContain('Apply theme');
});
