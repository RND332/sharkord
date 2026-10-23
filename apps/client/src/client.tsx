import { exposeServerDebugApi } from '@/features/server/actions';
import { exposePluginStore } from '@/features/server/plugins/plugin-store';
import { exposeLibs, exposeReact } from '@/helpers/exposes';
import { initSentry } from '@/helpers/sentry';
import { migrateLegacyStorageKeys } from '@/helpers/storage';
import { i18nReady } from '@/i18n';
import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

// the browser gets the helpers of the console and the storage of the older
// versions before the first render
migrateLegacyStorageKeys();

initSentry(VITE_SENTRY_DSN, import.meta.env.MODE, VITE_APP_VERSION);

exposeReact();
exposeLibs();
exposePluginStore();
exposeServerDebugApi();

await i18nReady;

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
});
