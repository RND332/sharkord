import type { TDisplayItem } from '@/hooks/use-upload-files';
import commonEn from '@/i18n/locales/en/common.json';
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
  resources: { en: { common: commonEn } },
  interpolation: { escapeValue: false }
});

const { PreviewFile } = await import('../preview-file');

const mode = process.argv[2] ?? 'image';
const progress = Number(process.argv[3] ?? '45');

const items: Record<string, TDisplayItem> = {
  image: {
    id: 'image-1',
    name: 'image.png',
    size: 471244,
    extension: '.png',
    previewUrl: 'blob:image',
    progress
  },
  'image-done': {
    id: 'image-2',
    name: 'image.png',
    size: 471244,
    extension: '.png',
    previewUrl: 'blob:image'
  },
  document: {
    id: 'document-1',
    name: 'report.txt',
    size: 64,
    extension: '.txt',
    progress
  }
};

const item = items[mode];

if (!item) {
  throw new Error(`unknown mode: ${mode}`);
}

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <PreviewFile item={item} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
