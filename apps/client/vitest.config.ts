import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { playwright } from '@vitest/browser-playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import pkg from './package.json';

const systemChromium =
  process.platform === 'linux' && existsSync('/usr/bin/chromium')
    ? '/usr/bin/chromium'
    : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    },
    dedupe: ['react', 'react-dom']
  },
  define: {
    VITE_APP_VERSION: JSON.stringify(pkg.version)
  },
  test: {
    include: ['src/visual-tests/**/*.vrt.ts'],
    globalSetup: ['./src/visual-tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        actionTimeout: 5_000,
        contextOptions: { timezoneId: 'UTC' },
        launchOptions: systemChromium
          ? { executablePath: systemChromium }
          : undefined
      }),
      instances: [
        {
          browser: 'chromium',
          viewport: { width: 1440, height: 900 }
        }
      ]
    }
  }
});
