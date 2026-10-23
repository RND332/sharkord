// Renders the voice card context menu and prints the markup. The test runs
// this in its own process: bun keeps the first mock.module registration of a
// path for the whole test run, so the mocks of the other test files would leak in.
import commonEn from '@/i18n/locales/en/common.json';
import * as dodecagonUi from '@dodecagon/ui';
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

// the stored volume decides whether the stream starts muted
const storedVolumes =
  mode === 'muted' ? JSON.stringify({ 'userscreen-2': 0 }) : null;

globalThis.localStorage = {
  getItem: (key: string) =>
    key === 'dodecagon-volume-settings' ? storedVolumes : null,
  setItem: noop,
  removeItem: noop
} as unknown as Storage;

// the context menu content is portalled and stays closed in static markup, so
// the menu is rendered inline to keep the items observable
mock.module('@dodecagon/ui', () => ({
  ...dodecagonUi,
  ContextMenu: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="context-menu">{children}</div>
  ),
  ContextMenuTrigger: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="context-menu-trigger">{children}</div>
  ),
  ContextMenuContent: ({ children }: { children?: React.ReactNode }) => (
    <div role="menu" data-testid="context-menu-content">
      {children}
    </div>
  ),
  ContextMenuItem: ({ children }: { children?: React.ReactNode }) => (
    <div role="menuitem" data-testid="context-menu-item">
      {children}
    </div>
  ),
  ContextMenuCheckboxItem: ({
    children,
    checked
  }: {
    children?: React.ReactNode;
    checked?: boolean;
  }) => (
    <div
      role="menuitemcheckbox"
      aria-checked={checked ? 'true' : 'false'}
      data-testid="context-menu-checkbox-item"
    >
      {children}
    </div>
  ),
  ContextMenuSeparator: () => <hr />,
  Slider: ({
    'aria-label': ariaLabel,
    value
  }: {
    'aria-label'?: string;
    value?: number[];
  }) => (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={value?.[0]}
      data-testid="slider"
    />
  )
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { common: commonEn } },
  interpolation: { escapeValue: false }
});

const { VolumeControlProvider } =
  await import('@/components/voice-provider/volume-control-context');
const { VoiceCardContextMenu } = await import('../voice-card-context-menu');

const html = renderToStaticMarkup(
  <I18nextProvider i18n={i18n}>
    <VolumeControlProvider>
      <VoiceCardContextMenu
        demo={{ isViewing: true, onToggle: noop }}
        volumeKey="userscreen-2"
        zoom={{ isEnabled: false, onToggle: noop }}
      >
        <button type="button">Stream</button>
      </VoiceCardContextMenu>
    </VolumeControlProvider>
  </I18nextProvider>
);

console.log(`__MARKUP__${html}`);
