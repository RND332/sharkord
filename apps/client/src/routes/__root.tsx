import {
  createRootRoute,
  HeadContent,
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
  shellComponent: RootDocument
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <div id="portal" />
        <div id="imagePortal" />
        <Scripts />
      </body>
    </html>
  );
}
