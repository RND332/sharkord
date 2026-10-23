import { Toaster } from '@dodecagon/ui';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter/wght-italic.css';
import 'prosemirror-view/style/prosemirror.css';
import { DebugInfo } from './components/debug-info/index.tsx';
import { StoreDebug } from './components/debug/store-debug.tsx';
import { DevicesProvider } from './components/devices-provider/index.tsx';
import { DialogsProvider } from './components/dialogs/index.tsx';
import { GlobalErrorBoundary } from './components/error-boundary/global-error-boundary.tsx';
import { HotkeysController } from './components/hotkeys-controller/index.tsx';
import { PluginsController } from './components/plugins-controller/index.tsx';
import { AutoLoginController } from './components/routing/auto-login-controller.tsx';
import { AppScreens } from './components/routing/screens.tsx';
import { ServerScreensProvider } from './components/server-screens/index.tsx';
import { ThemeProvider } from './components/theme-provider/index.tsx';
import { LocalStorageKey } from './helpers/storage.ts';
import './index.css';

const Shell = ({ children }: { children?: React.ReactNode }) => {
  return (
    <ThemeProvider
      defaultTheme="dark"
      storageKey={LocalStorageKey.VITE_UI_THEME}
    >
      <GlobalErrorBoundary>
        <DebugInfo />
        <Toaster />
        <StoreDebug />
        <HotkeysController />
        <DevicesProvider>
          <PluginsController />
          <DialogsProvider />
          <ServerScreensProvider />
          <AutoLoginController />
          {children}
        </DevicesProvider>
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
};

// everything in here needs a browser, the root route renders it only after the
// hydration
export function ClientShell() {
  return <Shell />;
}

// the tests of the interface render the app without a router, so the screens
// are chosen the old way
export function ClientApp() {
  return (
    <Shell>
      <AppScreens />
    </Shell>
  );
}
