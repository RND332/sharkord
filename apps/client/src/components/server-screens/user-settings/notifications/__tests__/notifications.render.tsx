// Renders the notification settings and prints the markup. The test runs this
// in its own process: bun keeps the first mock.module registration of a path
// for the whole test run, so the mocks of the other test files would leak in.
import settingsEn from '@/i18n/locales/en/settings.json';
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

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

// the enabled choices are passed in as a comma separated list
const enabled = new Set((process.argv[2] ?? '').split(',').filter(Boolean));

const appState = {
  browserNotifications: enabled.has('all'),
  browserNotificationsForMentions: enabled.has('mentions'),
  browserNotificationsForDms: enabled.has('dms'),
  browserNotificationsForReplies: enabled.has('replies'),
  notificationSounds: enabled.has('sounds'),
  messageSentSound: enabled.has('sentSound')
};

const { setStoreState } = await import('@/features/store');
const { appInitialState } = await import('@/features/app/slice');

setStoreState({ app: { ...appInitialState, ...appState } });

const { Notifications } = await import('../index');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <Notifications />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
