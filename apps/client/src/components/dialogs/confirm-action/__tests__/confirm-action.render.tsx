// Renders the shared confirmation dialog and prints the markup. The test runs
// this in its own process: bun keeps the first mock.module registration of a
// path for the whole test run, so the mocks of the other test files would leak in.
import dialogsEn from '@/i18n/locales/en/dialogs.json';
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
    location: {
      href: 'http://localhost',
      host: 'localhost',
      protocol: 'http:'
    },
    getComputedStyle: () => ({ getPropertyValue: () => '' })
  } as unknown as Window & typeof globalThis);

globalThis.document =
  globalThis.document ??
  ({
    addEventListener: noop,
    removeEventListener: noop,
    head: { appendChild: noop },
    body: { appendChild: noop, style: {} },
    documentElement: { clientWidth: 1024, clientHeight: 768, style: {} },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createTextNode: () => ({}),
    getElementById: () => null,
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

// the dialog content lives in a radix portal, which the server renderer drops,
// so the portal primitive is mocked to render its children inline
mock.module('@radix-ui/react-portal', () => ({
  Portal: ({ children }: { children?: React.ReactNode }) => children,
  PortalProvider: ({ children }: { children?: React.ReactNode }) => children
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

const mode = process.argv[2] ?? 'default';

const dangerProps = {
  title: 'Delete RND 332?',
  message:
    'The user and every message of that user are removed. This cannot be undone.',
  confirmLabel: 'Delete User',
  cancelLabel: 'Keep the user',
  variant: 'danger' as const
};

const props = mode === 'danger' ? dangerProps : {};

const { ConfirmActionDialog } = await import('../index');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <ConfirmActionDialog isOpen close={noop} {...props} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
