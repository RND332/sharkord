// Renders the delete user dialog and prints the markup. The test runs this in
// its own process: bun keeps the first mock.module registration of a path for
// the whole test run, so the mocks of the other test files would leak in.
import dialogsEn from '@/i18n/locales/en/dialogs.json';
import { renderInDom } from '@/test-utils/dom-render';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

const user = {
  id: 7,
  name: 'mika'
};

mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    users: {
      delete: { mutate: async () => undefined }
    }
  })
}));

mock.module('@/features/server/hooks', () => ({
  useServerName: () => 'Rnd Community'
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

const { DeleteUserDialog } = await import('../index');

const html = await renderInDom(
  <I18nextProvider i18n={i18n}>
    <DeleteUserDialog
      isOpen
      close={noop}
      user={user as never}
      refetch={async () => undefined}
    />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
