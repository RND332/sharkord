// Renders a marketplace row and prints the markup. The test runs this in its
// own process: bun keeps the first mock.module registration of a path for the
// whole test run, so the mocks of the other test files would leak in.
import settingsEn from '@/i18n/locales/en/settings.json';
import { mock } from 'bun:test';
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

const mode = process.argv[2] ?? 'default';

mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    plugins: {
      install: { mutate: async () => undefined },
      update: { mutate: async () => undefined }
    }
  })
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { PLUGIN_SDK_VERSION } = await import('@dodecagon/shared');
const { MarketplaceItem } = await import('../marketplace/marketplace-item');

const entry = {
  plugin: {
    id: 'audio-recorder',
    name: 'Audio Recorder',
    description: 'Save voice sessions when participants consent.',
    author: 'Dodecagon Community',
    logo: 'https://example.com/logo.png',
    homepage: 'https://example.com/audio-recorder',
    verified: true,
    tags: ['voice']
  },
  versions: [
    {
      version: '1.0.0',
      downloadUrl: 'https://example.com/audio-recorder.tar.gz',
      checksum: 'abc',
      sdkVersion:
        mode === 'incompatible' ? PLUGIN_SDK_VERSION + 1 : PLUGIN_SDK_VERSION,
      size: 1024,
      timestamp: 1700000000000
    }
  ]
};

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <MarketplaceItem
      entry={entry}
      isInstalled={mode === 'installed' || mode === 'update'}
      installedVersion={mode === 'update' ? '0.9.0' : undefined}
      refetchInstalled={async () => undefined}
    />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
