import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'render',
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 30_000,
    defaultPreloadGcTime: 10 * 60_000
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
