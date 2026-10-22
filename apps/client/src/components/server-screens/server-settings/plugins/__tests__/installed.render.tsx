// Renders the installed plugin rows and prints the markup. The test runs this
// in its own process: bun keeps the first mock.module registration of a path
// for the whole test run, so the mocks of the other test files would leak in.
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
      toggle: { mutate: async () => undefined },
      remove: { mutate: async () => undefined }
    }
  })
}));

mock.module('@/features/server/hooks', () => ({
  usePluginsEnabled: () => mode !== 'disabled'
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { InstalledPlugins } = await import('../installed');

const plugin = {
  id: 'polls',
  name: 'Polls',
  description: 'Create quick votes in text channels',
  author: 'Dodecagon Community',
  enabled: mode !== 'off',
  sdkVersion: 2,
  version: '1.0.0',
  path: '/plugins/polls',
  logo: undefined,
  homepage: undefined,
  loadError: mode === 'error' ? 'boom' : undefined
};

const plugins =
  mode === 'empty'
    ? []
    : mode === 'single'
      ? [plugin]
      : mode === 'error'
        ? [plugin]
        : mode === 'off'
          ? [plugin]
          : [plugin, { ...plugin, id: 'moderation', name: 'Moderation' }];

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <InstalledPlugins
      plugins={plugins}
      loading={false}
      refetch={async () => undefined}
    />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
