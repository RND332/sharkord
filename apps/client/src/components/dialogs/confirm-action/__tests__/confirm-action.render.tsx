// Renders the shared confirmation dialog and prints the markup. The test runs
// this in its own process: bun keeps the first mock.module registration of a
// path for the whole test run, so the mocks of the other test files would leak in.
import dialogsEn from '@/i18n/locales/en/dialogs.json';
import { renderInDom } from '@/test-utils/dom-render';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

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

const html = await renderInDom(
  <I18nextProvider i18n={i18n}>
    <ConfirmActionDialog isOpen close={noop} {...props} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
