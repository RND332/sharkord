// Renders the disk summary and prints the markup. The test runs this in its
// own process: bun keeps the first mock.module registration of a path for the
// whole test run, so the mocks of the other test files would leak in.
import settingsEn from '@/i18n/locales/en/settings.json';
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

globalThis.window =
  globalThis.window ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    location: { href: 'http://localhost' }
  } as unknown as Window & typeof globalThis);

globalThis.document =
  globalThis.document ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    head: { appendChild: noop },
    body: { appendChild: noop },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createTextNode: () => ({}),
    getElementById: () => null,
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { DiskMetrics } = await import('../metrics');

const GIGABYTE = 1024 ** 3;
const MEGABYTE = 1024 ** 2;

const mode = process.argv[2] ?? 'default';

const diskMetrics = {
  totalSpace: 10 * GIGABYTE,
  usedSpace: 3.2 * GIGABYTE,
  freeSpace: 1.2 * GIGABYTE,
  dodecagonUsedSpace: 800 * MEGABYTE
};

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <DiskMetrics
      diskMetrics={
        mode === 'missing'
          ? undefined
          : mode === 'no-capacity'
            ? { ...diskMetrics, totalSpace: 0 }
            : diskMetrics
      }
      pluginDataUsed={mode === 'plugins' ? 800 * MEGABYTE : undefined}
    />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
