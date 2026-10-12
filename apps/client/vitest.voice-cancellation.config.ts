import react from '@vitejs/plugin-react-swc';
import { playwright } from '@vitest/browser-playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const systemChromium =
  process.platform === 'linux' && existsSync('/usr/bin/chromium')
    ? '/usr/bin/chromium'
    : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom']
  },
  define: {
    VITE_APP_VERSION: JSON.stringify('test'),
    VITE_SERVER_PORT: JSON.stringify('4995')
  },
  server: { port: 4995, strictPort: true },
  test: {
    include: ['src/visual-tests/voice-provider-cancellation.vrt.ts'],
    fileParallelism: false,
    testTimeout: 10_000,
    api: { port: 5195, strictPort: true },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: systemChromium
          ? { executablePath: systemChromium }
          : undefined
      }),
      instances: [
        { browser: 'chromium', viewport: { width: 900, height: 700 } }
      ]
    }
  }
});
