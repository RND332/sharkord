// Renders the voice chat button and prints the markup. The test runs this in
// its own process: bun keeps the first mock.module registration of a path for
// the whole test run, so the mocks of the other test files would leak in.
import topbarEn from '@/i18n/locales/en/topbar.json';
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
    location: { href: 'http://localhost' },
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

const mode = process.argv[2] ?? 'closed';

mock.module('@/features/app/hooks', () => ({
  useVoiceChatSidebar: () =>
    mode === 'open'
      ? { isOpen: true, channelId: 2 }
      : mode === 'other'
        ? { isOpen: true, channelId: 3 }
        : { isOpen: false, channelId: 2 }
}));

mock.module('@/features/app/actions', () => ({
  toggleVoiceChatSidebar: noop
}));

mock.module('@/features/server/hooks', () => ({
  useHasUnreadMentions: () => false,
  useUnreadMessagesCount: () => 0
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { topbar: topbarEn } },
  interpolation: { escapeValue: false }
});

const { VoiceChatButton } = await import('../voice-chat-button');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <VoiceChatButton channelId={2} />
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
