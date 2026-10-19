import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    include: [
      'src/visual-tests/compact-call-toolbar.vrt.ts',
      'src/visual-tests/voice-grid-layout.vrt.ts',
      'src/visual-tests/audio-device-menus.vrt.ts'
    ],
    api: { port: 55121, strictPort: true }
  }
});
