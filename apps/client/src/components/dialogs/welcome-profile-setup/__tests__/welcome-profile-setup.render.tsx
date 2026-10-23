// Renders the initial profile setup dialog and prints the markup. The test runs
// this in its own process: bun keeps the first mock.module registration of a
// path for the whole test run, so the mocks of the other test files would leak in.
import dialogsEn from '@/i18n/locales/en/dialogs.json';
import { renderInDom } from '@/test-utils/dom-render';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';

const noop = () => {};

const mode = process.argv[2] ?? 'default';

const avatarFile = { name: 'avatar.png' };
const bannerFile = { name: 'banner.png' };

const ownPublicUser = {
  id: 7,
  name: 'rnd332',
  bio: '',
  avatar: mode === 'default' ? avatarFile : undefined,
  avatarId: mode === 'default' ? 11 : undefined,
  banner: mode === 'default' ? bannerFile : undefined,
  profileColor: '#5865f2'
};

mock.module('@/lib/trpc', () => ({
  getTRPCClient: () => ({
    users: {
      update: { mutate: async () => undefined },
      changeAvatar: { mutate: async () => undefined },
      changeBanner: { mutate: async () => undefined }
    }
  })
}));

mock.module('@/features/server/hooks', () => ({
  useServerName: () => 'Dodecagon'
}));

mock.module('@/features/server/users/hooks', () => ({
  useOwnPublicUser: () => ownPublicUser
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { dialogs: dialogsEn } },
  interpolation: { escapeValue: false }
});

const { WelcomeProfileSetupDialog } = await import('../index');

const html = await renderInDom(
  <I18nextProvider i18n={i18n}>
    <WelcomeProfileSetupDialog isOpen close={noop} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
