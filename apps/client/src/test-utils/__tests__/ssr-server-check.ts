// the check runs in a child process: the test runner shares its module registry
// and its globals with the other test files, so a module that was imported
// once with a browser in place would never run its guard a second time
import { StoreDebug } from '@/components/debug/store-debug';
import { FullScreenImage } from '@/components/fullscreen-image/content';
import { SidebarDnd } from '@/components/left-sidebar/sidebar-dnd';
import { ServerScreensProvider } from '@/components/server-screens/index';
import { Themes } from '@/components/server-screens/user-settings/others/themes';
import { ThemeProvider } from '@/components/theme-provider/index';
import '@/features/server/actions';
import '@/helpers/is-debug';
import '@/helpers/voice-debug';
import '@/lib/trpc';
import i18next from 'i18next';
import { createElement, Suspense, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const REPORT_MARKER = 'SSR_CHECK:';

// the app instance of i18n is still loading when the tree renders, and a
// suspended subtree never reaches the body that has to stay browser free, so
// the check brings an instance that is ready
const createReadyI18n = () => {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'settings', 'sidebar'],
    defaultNS: 'common',
    resources: { en: { common: {}, settings: {}, sidebar: {} } },
    initImmediate: false
  });

  return instance;
};

const i18n = createReadyI18n();

const render = (element: ReactElement) => {
  return renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(Suspense, { fallback: null }, element)
    )
  );
};

const rendered: Record<string, number> = {
  FullScreenImage: render(
    createElement(FullScreenImage, { src: '/picture.png', alt: 'picture' })
  ).length,
  StoreDebug: render(createElement(StoreDebug)).length,
  ServerScreensProvider: render(createElement(ServerScreensProvider)).length,
  SidebarDnd: render(
    createElement(SidebarDnd, {
      children: createElement('span', null, 'sidebar')
    })
  ).length,
  Themes: render(
    createElement(ThemeProvider, {
      defaultTheme: 'dark',
      children: createElement(Themes)
    })
  ).length
};

console.log(
  `${REPORT_MARKER}${JSON.stringify({
    window: typeof window,
    document: typeof document,
    rendered
  })}`
);
