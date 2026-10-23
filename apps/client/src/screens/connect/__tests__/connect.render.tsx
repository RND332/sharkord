// Renders the connect screen header and prints the markup. The test runs this in
// its own process: bun keeps the first mock.module registration of a path for the
// whole test run, so the mocks of the other test files would leak in.
import connectEn from '@/i18n/locales/en/connect.json';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

// the footer shows the app version, which vite injects at build time
Object.assign(globalThis, { VITE_APP_VERSION: 'test' });

globalThis.window =
  globalThis.window ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    history: { replaceState: noop },
    location: { href: 'http://localhost', search: '', pathname: '/' },
    getComputedStyle: () => ({ getPropertyValue: () => '' })
  } as unknown as Window & typeof globalThis);

globalThis.document =
  globalThis.document ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    title: '',
    head: { appendChild: noop },
    body: { appendChild: noop, style: {} },
    documentElement: { clientWidth: 1024, clientHeight: 768, style: {} },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createTextNode: () => ({}),
    getElementById: () => null,
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

mock.module('@/features/server/hooks', () => ({
  useInfo: () => ({ name: 'ULTRABUSTER', description: 'A server' })
}));

mock.module('@/features/server/actions', () => ({ connect: noop }));

mock.module('@/screens/connect/hooks/use-oidc-login', () => ({
  useOidcLogin: () => ({
    isCompleting: false,
    isEnabled: false,
    isLocalLoginAllowed: true,
    startLogin: noop
  })
}));

mock.module('@/components/plugin-slot-renderer', () => ({
  PluginSlotRenderer: () => null
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { connect: connectEn } },
  interpolation: { escapeValue: false }
});

const { Connect } = await import('../index');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <Connect />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
