import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tanstackStart({
        prerender: {
          enabled: true,
          autoStaticPathsDiscovery: false,
          crawlLinks: false,
          failOnError: true
        },
        pages: [{ path: '/', prerender: { outputPath: '/index.html' } }]
      }),
      react(),
      tailwindcss()
    ],
    build: {
      target: 'esnext',
      manifest: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      VITE_APP_VERSION: JSON.stringify(pkg.version),
      VITE_SERVER_PORT: JSON.stringify(env.SERVER_PORT || '4991'),
      VITE_SENTRY_DSN: JSON.stringify(env.SENTRY_DSN || '')
    },
    server: {
      proxy: {
        '/manifest.json': `http://localhost:${env.SERVER_PORT || 4991}`,
        // sanitizing rewrites message image urls to same-origin paths, which in dev is
        // this vite server rather than the one holding the files
        '/public': `http://localhost:${env.SERVER_PORT || 4991}`
      }
    }
  };
});
