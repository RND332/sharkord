// Renders the audio device popup and prints the markup. The test runs this in
// its own process: bun keeps the first mock.module registration of a path for
// the whole test run, so the mocks of the other test files would leak in.
import audioEn from '@/i18n/locales/en/audio.json';
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
    getElementsByTagName: () => [{ appendChild: noop }]
  } as unknown as Document);

// the popover content lives in a radix portal, which the server renderer
// drops, so the popover primitives are mocked to render their children inline
mock.module('@radix-ui/react-popover', () => ({
  Root: ({ children }: { children?: React.ReactNode }) => children,
  Trigger: ({ children }: { children?: React.ReactNode }) => children,
  Portal: ({ children }: { children?: React.ReactNode }) => children,
  Anchor: ({ children }: { children?: React.ReactNode }) => children,
  Content: ({
    children,
    className
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>
}));

mock.module('@/features/server-screens/actions', () => ({
  openServerScreen: noop
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { audio: audioEn, settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { DevicesProviderContext } =
  await import('@/components/devices-provider');
const { AudioSettingsMenu } = await import('../index');

const kind = process.argv[2] === 'output' ? 'output' : 'microphone';

const devicesContext = {
  loading: false,
  devices: {
    microphoneId: 'mic',
    playbackId: 'out',
    microphoneVolume: 75,
    playbackVolume: 60
  },
  inputDevices: [{ deviceId: 'mic', label: 'Studio microphone' }],
  playbackDevices: [{ deviceId: 'out', label: 'Headphones' }],
  videoDevices: [],
  saveDevices: noop,
  loadDevices: async () => {}
};

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <DevicesProviderContext.Provider value={devicesContext as never}>
      <AudioSettingsMenu kind={kind}>
        <button type="button">trigger</button>
      </AudioSettingsMenu>
    </DevicesProviderContext.Provider>
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
