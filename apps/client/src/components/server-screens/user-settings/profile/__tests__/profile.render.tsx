// Renders the profile settings and prints the markup. The test runs this in
// its own process: bun keeps the first mock.module registration of a path for
// the whole test run, so the mocks of the other test files would leak in.
import commonEn from '@/i18n/locales/en/common.json';
import settingsEn from '@/i18n/locales/en/settings.json';
import { UserStatus } from '@dodecagon/shared';
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
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

mock.module('@radix-ui/react-portal', () => ({
  Portal: ({ children }: { children: unknown }) => children,
  PortalProvider: ({ children }: { children: unknown }) => children
}));

const bio = process.argv[2] ?? '';

mock.module('@/features/server/users/hooks', () => ({
  useOwnPublicUser: () => ({
    id: 'user-1',
    name: 'RND332',
    username: 'rnd332',
    profileColor: '#5865f2',
    bio,
    status: 'online',
    avatar: null,
    banner: null,
    createdAt: '2026-06-13T00:00:00.000Z'
  })
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      common: commonEn,
      settings: settingsEn
    }
  },
  interpolation: { escapeValue: false }
});

const { setStoreState } = await import('@/features/store');
const { serverInitialState } = await import('@/features/server/slice');

setStoreState({
  server: {
    ...serverInitialState,
    ownUserId: 1,
    users: [
      {
        id: 1,
        name: 'RND332',
        bio,
        profileColor: '#5865f2',
        avatar: null,
        avatarId: null,
        banner: null,
        bannerId: null,
        banned: false,
        roleIds: [],
        status: UserStatus.ONLINE,
        createdAt: new Date('2026-06-13T00:00:00Z').getTime()
      }
    ]
  }
});

const { Profile } = await import('../index');
const { ColorPickerPopover } = await import('../color-picker-popover');

const profileHtml = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <Profile />
  </I18nextProvider>
);

const pickerHtml = renderToStaticMarkup(
  <ColorPickerPopover
    open
    onOpenChange={noop}
    value="#5865f2"
    onChange={noop}
    label="Profile color"
  >
    <button type="button">anchor</button>
  </ColorPickerPopover>
);

const closedPickerHtml = renderToStaticMarkup(
  <ColorPickerPopover
    open={false}
    onOpenChange={noop}
    value="#5865f2"
    onChange={noop}
    label="Profile color"
  >
    <button type="button">anchor</button>
  </ColorPickerPopover>
);

console.log(`__PROFILE__${profileHtml}`);
console.log(`__PICKER__${pickerHtml}`);
console.log(`__CLOSED__${closedPickerHtml}`);
