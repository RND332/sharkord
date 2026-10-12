import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/')({
  component: ClientOnlyApp
});

function ClientOnlyApp() {
  const [app, setApp] = useState<ReactNode>(null);

  useEffect(() => {
    void import('../main').then(({ ClientApp }) => setApp(<ClientApp />));
  }, []);

  return app;
}
