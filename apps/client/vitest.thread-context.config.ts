import { defineConfig } from 'vitest/config';
import config from './vitest.config';

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: ['src/visual-tests/thread-context.browser.ts'],
    globalSetup: ['./src/visual-tests/thread-context-setup.ts'],
    api: { port: 55129, strictPort: true },
    testTimeout: 30_000
  },
  server: { port: 42129, strictPort: true }
});
