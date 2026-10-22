import { getTheme, type TTheme } from '@/components/theme-provider/themes';
import settingsEn from '@/i18n/locales/en/settings.json';
import { mock } from 'bun:test';
import i18next from 'i18next';
import { createElement, type ReactNode } from 'react';
import * as actualReactDom from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';

const MIKU: TTheme = getTheme('hatsune-miku');

(globalThis as unknown as { window: unknown }).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getComputedStyle: () => ({
    getPropertyValue: () => '',
    paddingLeft: '0',
    paddingRight: '0'
  }),
  location: { host: 'discord.rnd332.com', protocol: 'https:' }
};

(globalThis as unknown as { document: unknown }).document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, removeChild: () => {} },
  documentElement: { clientWidth: 1024, clientHeight: 768, style: {} },
  createElement: () => ({
    setAttribute: () => {},
    style: {},
    appendChild: () => {}
  }),
  createTextNode: () => ({}),
  getElementsByTagName: () => [],
  getElementById: () => null
};

mock.module('react-dom', () => ({
  ...actualReactDom,
  createPortal: (children: ReactNode) => children
}));

mock.module('@/components/theme-provider/use-theme', () => ({
  useTheme: () => ({
    theme: 'hatsune-miku',
    resolvedTheme: MIKU,
    setTheme: () => {}
  })
}));

const i18n = i18next.createInstance();

await i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { settings: settingsEn } },
  interpolation: { escapeValue: false }
});

const { ThemeCatalog } =
  await import('@/components/server-screens/user-settings/others/theme-catalog');
const { ThemePreview } =
  await import('@/components/server-screens/user-settings/others/theme-preview');
const { ThemePreviewToast, Themes } =
  await import('@/components/server-screens/user-settings/others/themes');

const withI18n = (children: ReactNode) =>
  createElement(I18nextProvider, { i18n }, children);

const catalogMarkup = renderToStaticMarkup(
  withI18n(
    createElement(ThemeCatalog, {
      selectedId: 'hatsune-miku',
      onPreview: () => {}
    })
  )
);

const previewMarkup = renderToStaticMarkup(
  withI18n(createElement(ThemePreview, { theme: MIKU }))
);

const toastMarkup = renderToStaticMarkup(
  withI18n(
    createElement(ThemePreviewToast, {
      theme: MIKU,
      onApply: () => {},
      onCancel: () => {}
    })
  )
);

const sectionMarkup = renderToStaticMarkup(withI18n(createElement(Themes)));

console.log(
  `__RESULT__${JSON.stringify({
    catalogMarkup,
    previewMarkup,
    toastMarkup,
    sectionMarkup
  })}`
);
