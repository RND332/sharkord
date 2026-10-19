import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { fsAllow } from './vite-fs-allow';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom']
  },
  define: { VITE_APP_VERSION: JSON.stringify('test') },
  server: { port: 6347, strictPort: true, fs: { allow: fsAllow } },
  test: {
    api: { port: 6347, strictPort: true },
    include: ['src/visual-tests/screen-share-invitation*.vrt.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: { executablePath: '/usr/bin/chromium' }
      }),
      instances: [
        { browser: 'chromium', viewport: { width: 1440, height: 900 } }
      ]
    }
  }
});
