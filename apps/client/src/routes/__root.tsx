import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts
} from '@tanstack/react-router';
import '../index.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'Sharkord' }
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.ico' },
      { rel: 'manifest', href: '/manifest.json' }
    ]
  }),
  component: RootDocument
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <div id="portal" />
        <div id="imagePortal" />
        <Scripts />
      </body>
    </html>
  );
}
