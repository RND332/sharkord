// Renders the plugin marketplace while the registry loads and prints the
// markup. The test runs this in its own process: bun keeps the first
// mock.module registration of a path for the whole test run, so the mocks of
// the other test files would leak in.
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

mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    plugins: {
      install: { mutate: async () => undefined },
      update: { mutate: async () => undefined }
    }
  })
}));

mock.module(
  '@/components/server-screens/server-settings/plugins/marketplace/hooks',
  () => ({
    useMarketplaceData: () => ({
      filtered: [],
      loading: true,
      error: null,
      search: '',
      setSearch: noop,
      isRefreshing: false,
      refresh: async () => undefined
    })
  })
);

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { Marketplace } = await import('../marketplace');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <Marketplace plugins={[]} refetchInstalled={async () => undefined} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
