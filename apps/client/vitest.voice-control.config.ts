import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { playwright } from '@vitest/browser-playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { fsAllow } from './vite-fs-allow';

const systemChromium =
  process.platform === 'linux' && existsSync('/usr/bin/chromium')
    ? '/usr/bin/chromium'
    : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom']
  },
  server: { fs: { allow: fsAllow } },
  test: {
    include: ['src/visual-tests/voice-control-dock.vrt.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    server: { port: 5184, strictPort: true },
    api: { port: 5184, strictPort: true },
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
        { browser: 'chromium', viewport: { width: 1440, height: 900 } }
      ]
    }
  }
});
